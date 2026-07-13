import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// OAuth `state` is HMAC-signed so the callback can trust the userId inside it.
// Keyed off GOOGLE_CLIENT_SECRET — already required for this flow, never sent
// to the client, so no extra env var is needed.
const STATE_MAX_AGE_MS = 10 * 60 * 1000;

function signStatePayload(payload) {
  return createHmac('sha256', GOOGLE_CLIENT_SECRET).update(payload).digest('base64url');
}

/**
 * Create a signed OAuth state token binding the flow to a user.
 */
export function createState(userId) {
  const payload = Buffer.from(JSON.stringify({ userId, ts: Date.now() })).toString('base64url');
  return `${payload}.${signStatePayload(payload)}`;
}

/**
 * Verify a state token's signature and freshness.
 * @returns {string|null} the userId, or null if invalid/expired
 */
export function verifyState(state) {
  if (typeof state !== 'string') return null;
  const [payload, sig] = state.split('.');
  if (!payload || !sig) return null;
  const expected = Buffer.from(signStatePayload(payload));
  const actual = Buffer.from(sig);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const { userId, ts } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!userId || typeof ts !== 'number' || Date.now() - ts > STATE_MAX_AGE_MS) return null;
    return userId;
  } catch {
    return null;
  }
}

// Service role client — bypasses RLS, used only server-side for gdrive_tokens
let _serviceClient;
function getServiceClient() {
  if (!_serviceClient) {
    _serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }
  return _serviceClient;
}

const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke';

/**
 * Build the Google OAuth consent URL.
 * @param {string} redirectUri - The callback URL
 * @param {string} state - Opaque state string (JSON-encoded userId + csrf)
 */
export function getAuthUrl(redirectUri, state) {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/**
 * Exchange an authorization code for access + refresh tokens.
 */
export async function exchangeCodeForTokens(code, redirectUri) {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token exchange failed: ${body}`);
  }
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in, // seconds
  };
}

/**
 * Store tokens in the gdrive_tokens table (upsert).
 */
export async function storeTokens(userId, { accessToken, refreshToken, expiresIn }) {
  const tokenExpiry = new Date(Date.now() + expiresIn * 1000).toISOString();
  const db = getServiceClient();
  const { error } = await db
    .from('gdrive_tokens')
    .upsert({
      user_id: userId,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expiry: tokenExpiry,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  if (error) throw error;
}

/**
 * Get a valid access token for a user, refreshing if expired.
 * Throws DriveDisconnectedError if refresh fails (token revoked).
 */
export async function getValidTokens(userId) {
  const db = getServiceClient();
  const { data: row, error } = await db
    .from('gdrive_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !row) {
    throw new DriveDisconnectedError();
  }

  // If token expires in the next 5 minutes, refresh it
  const expiresAt = new Date(row.token_expiry).getTime();
  if (Date.now() < expiresAt - 5 * 60 * 1000) {
    return row.access_token;
  }

  // Refresh the token
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: row.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    // Refresh failed — token was likely revoked. Clean up.
    await db.from('gdrive_tokens').delete().eq('user_id', userId);
    throw new DriveDisconnectedError();
  }

  const data = await res.json();
  const newExpiry = new Date(Date.now() + data.expires_in * 1000).toISOString();

  await db
    .from('gdrive_tokens')
    .update({
      access_token: data.access_token,
      token_expiry: newExpiry,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  return data.access_token;
}

/**
 * Check if a user has Drive connected (token row exists).
 */
export async function hasConnection(userId) {
  const db = getServiceClient();
  const { data, error } = await db
    .from('gdrive_tokens')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

/**
 * Revoke tokens and delete the token row.
 */
export async function revokeAndDelete(userId) {
  const db = getServiceClient();
  const { data: row } = await db
    .from('gdrive_tokens')
    .select('refresh_token')
    .eq('user_id', userId)
    .single();

  if (row?.refresh_token) {
    // Best-effort revocation — don't fail if Google rejects it
    await fetch(`${REVOKE_ENDPOINT}?token=${row.refresh_token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }).catch(() => {});
  }

  await db.from('gdrive_tokens').delete().eq('user_id', userId);
}

/**
 * Custom error for disconnected Drive state.
 */
export class DriveDisconnectedError extends Error {
  constructor() {
    super('Google Drive is not connected');
    this.name = 'DriveDisconnectedError';
  }
}
