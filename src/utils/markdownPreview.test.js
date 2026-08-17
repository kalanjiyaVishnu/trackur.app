import { describe, it, expect } from 'vitest';
import { markdownToPreview } from './markdownPreview.js';

describe('markdownToPreview', () => {
  it('returns an empty string for empty input', () => {
    expect(markdownToPreview('')).toBe('');
    expect(markdownToPreview(null)).toBe('');
    expect(markdownToPreview(undefined)).toBe('');
  });

  it('strips emphasis markers', () => {
    expect(markdownToPreview('**bold** and *italic*')).toBe('bold and italic');
    expect(markdownToPreview('__bold__ and _italic_')).toBe('bold and italic');
    expect(markdownToPreview('~~struck~~')).toBe('struck');
  });

  it('strips headings and blockquotes', () => {
    expect(markdownToPreview('## Interview prep')).toBe('Interview prep');
    expect(markdownToPreview('> quoted line')).toBe('quoted line');
  });

  it('strips list bullets, including task lists', () => {
    expect(markdownToPreview('- one\n- two')).toBe('one two');
    expect(markdownToPreview('1. first\n2. second')).toBe('first second');
    expect(markdownToPreview('- [ ] todo\n- [x] done')).toBe('todo done');
  });

  it('keeps link and image labels but drops the URLs', () => {
    expect(markdownToPreview('[the posting](https://example.com)')).toBe('the posting');
    expect(markdownToPreview('![alt text](https://example.com/a.png)')).toBe('alt text');
  });

  it('keeps code content but drops the fences and backticks', () => {
    expect(markdownToPreview('`inline`')).toBe('inline');
    expect(markdownToPreview('```js\nconst a = 1;\n```')).toBe('const a = 1;');
  });

  it('collapses whitespace across lines', () => {
    expect(markdownToPreview('line one\n\n\nline two')).toBe('line one line two');
  });

  it('leaves plain text untouched', () => {
    expect(markdownToPreview('Just a normal note.')).toBe('Just a normal note.');
  });

  it('flattens tables into their cell text', () => {
    const table = '| Round | Who |\n| --- | --- |\n| Phone | Dana |';
    expect(markdownToPreview(table)).toBe('Round Who Phone Dana');
  });
});
