import { describe, it, expect } from 'vitest';
import { toApp, toDb } from './followupAdapter.js';

describe('followupAdapter.toApp', () => {
  it('maps snake_case columns to camelCase', () => {
    expect(toApp({
      id: 'f1',
      job_id: 'j1',
      poc_name: 'Dana',
      poc_role: 'Recruiter',
      poc_email: 'dana@acme.com',
      conversation: 'Call went well',
      followed_up_on: '2026-08-01',
      next_follow_up: '2026-08-15',
      created_at: '2026-08-01T10:00:00Z',
      updated_at: '2026-08-01T10:00:00Z',
    })).toEqual({
      id: 'f1',
      jobId: 'j1',
      pocName: 'Dana',
      pocRole: 'Recruiter',
      pocEmail: 'dana@acme.com',
      conversation: 'Call went well',
      followedUpOn: '2026-08-01',
      nextFollowUp: '2026-08-15',
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z',
    });
  });

  it('turns null text columns into empty strings so inputs stay controlled', () => {
    const app = toApp({ id: 'f1', job_id: 'j1', poc_name: null, conversation: null, next_follow_up: null });
    expect(app.pocName).toBe('');
    expect(app.conversation).toBe('');
    expect(app.nextFollowUp).toBe('');
  });
});

describe('followupAdapter.toDb', () => {
  it('maps camelCase to snake_case', () => {
    expect(toDb({
      jobId: 'j1',
      pocName: 'Dana',
      conversation: 'Spoke today',
      followedUpOn: '2026-08-01',
    })).toEqual({
      job_id: 'j1',
      poc_name: 'Dana',
      conversation: 'Spoke today',
      followed_up_on: '2026-08-01',
    });
  });

  it('omits keys that were not provided, so partial updates do not blank fields', () => {
    const row = toDb({ conversation: 'edited' });
    expect(row).toEqual({ conversation: 'edited' });
    expect('poc_name' in row).toBe(false);
    expect('next_follow_up' in row).toBe(false);
  });

  it('writes empty strings as null rather than empty text', () => {
    expect(toDb({ pocName: '', pocEmail: '', nextFollowUp: '' })).toEqual({
      poc_name: null,
      poc_email: null,
      next_follow_up: null,
    });
  });

  it('distinguishes clearing a field from leaving it alone', () => {
    expect(toDb({ nextFollowUp: '' })).toEqual({ next_follow_up: null });
    expect(toDb({})).toEqual({});
  });
});
