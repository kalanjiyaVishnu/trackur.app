import { describe, it, expect } from 'vitest';
import { normalizeUrl, isSafeHttpUrl } from './normalizeUrl.js';

describe('normalizeUrl', () => {
  it('prepends https:// to bare domains', () => {
    expect(normalizeUrl('example.com/job/123')).toBe('https://example.com/job/123');
  });

  it('leaves full URLs alone', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com');
    expect(normalizeUrl('http://example.com')).toBe('http://example.com');
  });

  it('trims whitespace and returns empty for blank input', () => {
    expect(normalizeUrl('  example.com  ')).toBe('https://example.com');
    expect(normalizeUrl('')).toBe('');
    expect(normalizeUrl('   ')).toBe('');
    expect(normalizeUrl(null)).toBe('');
  });
});

describe('isSafeHttpUrl', () => {
  it('accepts http(s) URLs only', () => {
    expect(isSafeHttpUrl('https://example.com')).toBe(true);
    expect(isSafeHttpUrl('http://example.com')).toBe(true);
  });

  it('rejects other schemes and empty values', () => {
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeHttpUrl('ftp://example.com')).toBe(false);
    expect(isSafeHttpUrl('')).toBe(false);
    expect(isSafeHttpUrl(null)).toBe(false);
  });
});
