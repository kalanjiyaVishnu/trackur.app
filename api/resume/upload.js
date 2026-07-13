import { ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3';
import { verifyAuth } from '../_lib/auth.js';
import { r2, BUCKET } from '../_lib/r2.js';

export const config = { api: { bodyParser: false } };

const MAX_SIZE = 200 * 1024; // 200 KB
const MAX_FILES = 10;
const ALLOWED_TYPES = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

// Magic-byte signatures — the Content-Type header is client-controlled, so the
// stored bytes are what gets validated.
const SIGNATURES = {
  pdf: Buffer.from('%PDF'),
  docx: Buffer.from([0x50, 0x4b, 0x03, 0x04]), // ZIP local file header
};

async function readBody(req, maxSize) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxSize) return null; // abort instead of buffering an oversized body
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = await verifyAuth(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const contentType = req.headers['content-type'];
  const ext = ALLOWED_TYPES[contentType];
  if (!ext) {
    return res.status(400).json({ error: 'Only PDF and DOCX files are allowed' });
  }

  const existing = await r2.send(
    new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: `${userId}/`,
      MaxKeys: MAX_FILES,
    }),
  );
  if ((existing.KeyCount ?? 0) >= MAX_FILES) {
    return res.status(400).json({ error: `Resume limit reached (${MAX_FILES} files)` });
  }

  const body = await readBody(req, MAX_SIZE);

  if (body === null) {
    return res.status(400).json({ error: 'File must be under 200 KB' });
  }

  const signature = SIGNATURES[ext];
  if (body.length < signature.length || !body.subarray(0, signature.length).equals(signature)) {
    return res.status(400).json({ error: 'File content does not match its type' });
  }

  const storagePath = `${userId}/${crypto.randomUUID()}.${ext}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: storagePath,
      Body: body,
      ContentType: contentType,
    }),
  );

  return res.status(200).json({ storagePath });
}
