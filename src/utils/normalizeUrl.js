/**
 * Prepends https:// to bare domains ("example.com/job" → "https://example.com/job").
 * Leaves empty values and already-protocol'd URLs alone.
 */
export function normalizeUrl(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * Whether a value is a renderable external link. Guards <a href> against
 * javascript: and other non-web schemes coming from stored data.
 */
export function isSafeHttpUrl(value) {
  return /^https?:\/\//i.test(value || '');
}
