import { describe, it, expect } from 'vitest';
import { downloadFilename, downloadErrorMessage } from './downloadResume.js';

describe('downloadFilename', () => {
  it('uses label + original extension when a label exists', () => {
    expect(downloadFilename({ filename: 'a1b2-uuid.pdf', label: 'Engineer Resume' }))
      .toBe('Engineer Resume.pdf');
  });

  it('falls back to the original filename without a label', () => {
    expect(downloadFilename({ filename: 'resume_v2.docx', label: '' }))
      .toBe('resume_v2.docx');
  });

  it('keeps the last extension for dotted filenames', () => {
    expect(downloadFilename({ filename: 'my.resume.final.pdf', label: 'Latest' }))
      .toBe('Latest.pdf');
  });
});

describe('downloadErrorMessage', () => {
  it('maps GDriveDisconnectedError to the reconnect message', () => {
    const err = new Error('disconnected');
    err.name = 'GDriveDisconnectedError';
    expect(downloadErrorMessage(err)).toMatch(/Reconnect/);
  });

  it('is generic for anything else', () => {
    expect(downloadErrorMessage(new Error('boom'))).toBe('Failed to download resume');
    expect(downloadErrorMessage(undefined)).toBe('Failed to download resume');
  });
});
