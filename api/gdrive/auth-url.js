import { verifyAuth } from '../_lib/auth.js';
import { createState, getAuthUrl } from '../_lib/google.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = await verifyAuth(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Build redirect URI from the request origin
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const redirectUri = `${protocol}://${host}/api/gdrive/callback`;

  const state = createState(userId);
  const url = getAuthUrl(redirectUri, state);

  return res.status(200).json({ url });
}
