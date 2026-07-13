import { describe, it, expect } from 'vitest';
import { toApp, toDb } from './supabaseAdapter.js';

describe('toApp', () => {
  it('maps snake_case row to camelCase job with defaults', () => {
    const job = toApp({
      id: 'j1',
      company: 'Acme',
      role: 'Engineer',
      stage: 'Applied',
      date_applied: null,
      todos: null,
      notes: null,
      resume_id: null,
      posting_url: null,
      archived_at: null,
    });
    expect(job).toEqual({
      id: 'j1',
      company: 'Acme',
      role: 'Engineer',
      stage: 'Applied',
      dateApplied: '',
      todos: [],
      notes: '',
      resumeId: null,
      postingUrl: '',
      archivedAt: null,
    });
  });

  it('preserves populated values', () => {
    const job = toApp({
      id: 'j2',
      company: 'Acme',
      role: 'Engineer',
      stage: 'Offer',
      date_applied: '2026-07-01',
      todos: [{ id: 't1', text: 'x', completed: false }],
      notes: 'hello',
      resume_id: 'r1',
      posting_url: 'https://example.com',
      archived_at: '2026-07-10T00:00:00Z',
    });
    expect(job.dateApplied).toBe('2026-07-01');
    expect(job.todos).toHaveLength(1);
    expect(job.resumeId).toBe('r1');
    expect(job.postingUrl).toBe('https://example.com');
    expect(job.archivedAt).toBe('2026-07-10T00:00:00Z');
  });
});

describe('toDb', () => {
  it('maps camelCase job to snake_case row, empty strings to null', () => {
    const row = toDb({
      company: 'Acme',
      role: 'Engineer',
      stage: 'Applied',
      dateApplied: '',
      todos: undefined,
      notes: '',
      resumeId: null,
      postingUrl: '',
      archivedAt: null,
    });
    expect(row).toEqual({
      company: 'Acme',
      role: 'Engineer',
      stage: 'Applied',
      date_applied: null,
      todos: [],
      notes: null,
      resume_id: null,
      posting_url: null,
      archived_at: null,
    });
  });

  it('includes id only when present', () => {
    expect(toDb({ company: 'A', role: 'B', stage: 'Applied' })).not.toHaveProperty('id');
    expect(toDb({ id: 'j1', company: 'A', role: 'B', stage: 'Applied' })).toMatchObject({ id: 'j1' });
  });

  it('round-trips through toApp', () => {
    const original = {
      id: 'j3',
      company: 'Acme',
      role: 'Engineer',
      stage: 'Screening',
      dateApplied: '2026-06-15',
      todos: [{ id: 't1', text: 'prep', completed: false }],
      notes: 'some notes',
      resumeId: 'r9',
      postingUrl: 'https://example.com/j',
      archivedAt: null,
    };
    expect(toApp(toDb(original))).toEqual(original);
  });
});
