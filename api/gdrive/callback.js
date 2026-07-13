import { exchangeCodeForTokens, storeTokens, verifyState } from '../_lib/google.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state, error: oauthError } = req.query;

  if (oauthError) {
    return res.status(200).send(errorPage('Google authorization was denied.'));
  }

  if (!code || !state) {
    return res.status(400).send(errorPage('Missing authorization code.'));
  }

  // State is HMAC-signed by auth-url.js — a forged or expired state cannot
  // bind tokens to an arbitrary userId.
  const userId = verifyState(state);
  if (!userId) {
    return res.status(400).send(errorPage('Invalid or expired authorization state. Please try connecting again.'));
  }

  // Build the same redirect URI used during the auth-url step
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const redirectUri = `${protocol}://${host}/api/gdrive/callback`;

  try {
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    await storeTokens(userId, tokens);
  } catch (err) {
    console.error('GDrive callback token exchange failed:', err);
    return res.status(200).send(errorPage('Failed to connect Google Drive. Please try again.'));
  }

  // Success — notify the opener window and close the popup
  return res.status(200).send(successPage());
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function successPage() {
  return `<!DOCTYPE html>
<html><head><title>Connected</title></head>
<body>
<p>Google Drive connected. This window will close automatically.</p>
<script>
  if (window.opener) {
    window.opener.postMessage({ type: 'gdrive-connected' }, window.location.origin);
  }
  window.close();
</script>
</body></html>`;
}

function errorPage(message) {
  return `<!DOCTYPE html>
<html><head><title>Error</title></head>
<body>
<p>${escapeHtml(message)}</p>
<p>You can close this window and try again.</p>
<script>
  if (window.opener) {
    window.opener.postMessage({ type: 'gdrive-error', message: ${JSON.stringify(message)} }, window.location.origin);
  }
</script>
</body></html>`;
}
