import { describe, it, expect } from 'vitest';
import {
  escapeCsvField,
  parseCsvLine,
  serializeTodos,
  parseTodosFromCsv,
  parseCsvFile,
} from './csvService.js';

describe('escapeCsvField', () => {
  it('passes plain values through', () => {
    expect(escapeCsvField('Acme')).toBe('Acme');
  });

  it('quotes fields containing commas', () => {
    expect(escapeCsvField('Acme, Inc')).toBe('"Acme, Inc"');
  });

  it('doubles embedded quotes', () => {
    expect(escapeCsvField('the "best" job')).toBe('"the ""best"" job"');
  });

  it('quotes fields containing newlines and semicolons', () => {
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
    expect(escapeCsvField('a;b')).toBe('"a;b"');
  });

  it('stringifies null and undefined to empty string', () => {
    expect(escapeCsvField(null)).toBe('');
    expect(escapeCsvField(undefined)).toBe('');
  });
});

describe('parseCsvLine', () => {
  it('splits simple fields', () => {
    expect(parseCsvLine('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  it('keeps commas inside quoted fields', () => {
    expect(parseCsvLine('"Acme, Inc",Engineer')).toEqual(['Acme, Inc', 'Engineer']);
  });

  it('unescapes doubled quotes', () => {
    expect(parseCsvLine('"the ""best"" job",x')).toEqual(['the "best" job', 'x']);
  });

  it('handles empty fields', () => {
    expect(parseCsvLine('a,,c')).toEqual(['a', '', 'c']);
  });

  it('round-trips escapeCsvField output', () => {
    const values = ['plain', 'with, comma', 'with "quotes"', 'semi;colon'];
    const line = values.map(escapeCsvField).join(',');
    expect(parseCsvLine(line)).toEqual(values);
  });
});

describe('todos serialization', () => {
  it('serializes completed state, text, and due date', () => {
    const todos = [
      { text: 'Follow up', dueDate: '2026-07-20', completed: false },
      { text: 'Send thanks', dueDate: null, completed: true },
    ];
    expect(serializeTodos(todos)).toBe('[ ] Follow up (2026-07-20); [x] Send thanks');
  });

  it('returns empty string for empty/missing lists', () => {
    expect(serializeTodos([])).toBe('');
    expect(serializeTodos(undefined)).toBe('');
  });

  it('round-trips through parseTodosFromCsv', () => {
    const todos = [
      { text: 'Follow up', dueDate: '2026-07-20', completed: false },
      { text: 'Send thanks', dueDate: null, completed: true },
    ];
    const parsed = parseTodosFromCsv(serializeTodos(todos));
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({ text: 'Follow up', dueDate: '2026-07-20', completed: false });
    expect(parsed[1]).toMatchObject({ text: 'Send thanks', dueDate: null, completed: true });
  });

  it('drops empty items', () => {
    expect(parseTodosFromCsv(' ; ')).toEqual([]);
  });
});

describe('parseCsvFile', () => {
  const makeFile = (text) => new File([text], 'jobs.csv', { type: 'text/csv' });

  it('parses a well-formed export', async () => {
    const csv = [
      'id,company,role,stage,dateApplied,todos,notes,postingUrl',
      'abc,"Acme, Inc",Engineer,Applied,2026-07-01,[ ] Follow up (2026-07-20),"note with ""quotes""",https://example.com/job',
    ].join('\n');
    const jobs = await parseCsvFile(makeFile(csv));
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      id: 'abc',
      company: 'Acme, Inc',
      role: 'Engineer',
      stage: 'Applied',
      dateApplied: '2026-07-01',
      notes: 'note with "quotes"',
      postingUrl: 'https://example.com/job',
    });
    expect(jobs[0].todos).toHaveLength(1);
    expect(jobs[0].todos[0]).toMatchObject({ text: 'Follow up', dueDate: '2026-07-20' });
  });

  it('converts legacy nextAction columns to a todo', async () => {
    const csv = [
      'company,role,stage,nextAction,nextActionDate',
      'Acme,Engineer,Applied,Call recruiter,2026-07-15',
    ].join('\n');
    const jobs = await parseCsvFile(makeFile(csv));
    expect(jobs).toHaveLength(1);
    expect(jobs[0].todos).toHaveLength(1);
    expect(jobs[0].todos[0]).toMatchObject({ text: 'Call recruiter', dueDate: '2026-07-15', completed: false });
    expect(jobs[0].nextAction).toBeUndefined();
  });

  it('skips rows without company and role, returns [] for header-only files', async () => {
    const csv = ['company,role', ',', 'Acme,Engineer'].join('\n');
    expect(await parseCsvFile(makeFile(csv))).toHaveLength(1);
    expect(await parseCsvFile(makeFile('company,role'))).toEqual([]);
  });
});
