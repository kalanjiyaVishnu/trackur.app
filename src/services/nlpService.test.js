import { describe, it, expect } from 'vitest';
import { parseJobInput, applyParsedFields } from './nlpService.js';
import { STAGES } from '../constants.js';

// Fixed reference date so relative phrases are deterministic.
// 2026-08-17 is a Monday.
const TODAY = new Date(2026, 7, 17);

const parse = (text) => parseJobInput(text, { today: TODAY }).fields;

describe('parseJobInput', () => {
  it('returns nothing for empty input', () => {
    expect(parseJobInput('').fields).toEqual({});
    expect(parseJobInput('   ').fields).toEqual({});
    expect(parseJobInput(null).fields).toEqual({});
  });

  it('parses a full quick-add line', () => {
    expect(parse('Applied to Senior Frontend Developer at HubSpot yesterday')).toEqual({
      stage: 'Applied',
      dateApplied: '2026-08-16',
      role: 'Senior Frontend Developer',
      company: 'HubSpot',
    });
  });

  it('reports which fields it filled', () => {
    const { matched } = parseJobInput('Interview at Google', { today: TODAY });
    expect(matched.sort()).toEqual(['company', 'stage']);
  });
});

describe('role and company', () => {
  it('splits on "at" and "@" with the role first', () => {
    expect(parse('Frontend Developer at HubSpot')).toMatchObject({
      role: 'Frontend Developer',
      company: 'HubSpot',
    });
    expect(parse('Data Scientist @ Spotify')).toMatchObject({
      role: 'Data Scientist',
      company: 'Spotify',
    });
  });

  it('splits on "for" with the role second', () => {
    expect(parse('Interviewing with Google for Senior SWE')).toMatchObject({
      company: 'Google',
      role: 'Senior SWE',
    });
  });

  it('strips leading connectives', () => {
    expect(parse('for Product Manager at Figma')).toMatchObject({
      role: 'Product Manager',
      company: 'Figma',
    });
  });

  it('uses job-title words to orient an ambiguous dash', () => {
    expect(parse('HubSpot - Frontend Developer')).toMatchObject({
      company: 'HubSpot',
      role: 'Frontend Developer',
    });
    expect(parse('Frontend Developer - HubSpot')).toMatchObject({
      role: 'Frontend Developer',
      company: 'HubSpot',
    });
  });

  it('reads a lone phrase as a role or a company', () => {
    expect(parse('Backend Engineer')).toMatchObject({ role: 'Backend Engineer' });
    expect(parse('Backend Engineer').company).toBeUndefined();

    expect(parse('Interview at Monzo')).toMatchObject({ company: 'Monzo' });
    expect(parse('Interview at Monzo').role).toBeUndefined();
  });

  it('keeps trailing asides out of the company name', () => {
    expect(parse('Applied to SRE at Cloudflare, referred by Sam')).toMatchObject({
      role: 'SRE',
      company: 'Cloudflare',
      notes: 'referred by Sam',
    });
  });

  it('treats a trailing clause as an aside when the role is already known', () => {
    expect(parse('Senior SWE at Google for the platform team')).toMatchObject({
      role: 'Senior SWE',
      company: 'Google',
      notes: 'the platform team',
    });
  });

  it('caps over-long values at the field limit', () => {
    const long = 'Engineer '.repeat(40).trim();
    expect(parse(`${long} at Acme`).role.length).toBeLessThanOrEqual(100);
  });
});

describe('dates', () => {
  it('handles today, yesterday and tomorrow', () => {
    expect(parse('Applied today').dateApplied).toBe('2026-08-17');
    expect(parse('Applied yesterday').dateApplied).toBe('2026-08-16');
    expect(parse('Interview tomorrow').dateApplied).toBe('2026-08-18');
  });

  it('handles "N units ago"', () => {
    expect(parse('Applied 3 days ago').dateApplied).toBe('2026-08-14');
    expect(parse('Applied a week ago').dateApplied).toBe('2026-08-10');
    expect(parse('Applied two weeks ago').dateApplied).toBe('2026-08-03');
    expect(parse('Applied 2 months ago').dateApplied).toBe('2026-06-17');
  });

  it('reads a weekday as the most recent one', () => {
    // TODAY is a Monday, so Friday means the 14th.
    expect(parse('Applied last Friday').dateApplied).toBe('2026-08-14');
    expect(parse('Applied on Friday').dateApplied).toBe('2026-08-14');
    expect(parse('Applied Monday').dateApplied).toBe('2026-08-17');
  });

  it('reads "next <weekday>" as the upcoming one', () => {
    expect(parse('Interview next Friday').dateApplied).toBe('2026-08-21');
    expect(parse('Interview next Monday').dateApplied).toBe('2026-08-24');
  });

  it('parses ISO dates', () => {
    expect(parse('Applied 2026-03-04').dateApplied).toBe('2026-03-04');
  });

  it('parses month-name dates in both orders', () => {
    expect(parse('Applied Aug 5').dateApplied).toBe('2026-08-05');
    expect(parse('Applied 5 August').dateApplied).toBe('2026-08-05');
    expect(parse('Applied August 5th, 2025').dateApplied).toBe('2025-08-05');
    expect(parse('Applied Sept. 3').dateApplied).toBe('2026-09-03');
  });

  it('rolls a year-less future date back to last year', () => {
    // December is >1 month ahead of an August reference date.
    expect(parse('Applied Dec 25').dateApplied).toBe('2025-12-25');
  });

  it('uses the day when a numeric date is unambiguous', () => {
    expect(parse('Applied 25/03/2026').dateApplied).toBe('2026-03-25');
    expect(parse('Applied 03/25/2026').dateApplied).toBe('2026-03-25');
  });

  it('ignores impossible dates and leaves them for notes', () => {
    const result = parse('Applied 45/99 at Acme');
    expect(result.dateApplied).toBeUndefined();
    expect(result.company).toBe('Acme');
  });

  it('does not read a version number as a date', () => {
    expect(parse('Engineer at Node.js Foundation').dateApplied).toBeUndefined();
  });
});

describe('stages', () => {
  it('maps keywords onto real stages', () => {
    expect(parse('Applied to X at Y').stage).toBe('Applied');
    expect(parse('Phone screen at Y').stage).toBe('Screening');
    expect(parse('Interviewing at Y').stage).toBe('Interviewing');
    expect(parse('Got an offer from Y').stage).toBe('Offer');
    expect(parse('Rejected by Y').stage).toBe('Rejected');
    expect(parse('Ghosted by Y').stage).toBe('Ghosted');
    expect(parse('Accepted at Y').stage).toBe('Accepted');
    expect(parse('Saved Frontend Dev at Y').stage).toBe('Opportunity');
  });

  it('only ever emits a stage the app knows about', () => {
    const inputs = ['applied', 'screening', 'interview', 'offer', 'rejected', 'ghosted', 'accepted'];
    for (const input of inputs) {
      expect(STAGES).toContain(parse(`${input} at Acme`).stage);
    }
  });

  it('prefers the longer phrase over its substring', () => {
    expect(parse('Phone screen at Acme').stage).toBe('Screening');
  });

  it('does not read "Lead" in a job title as a stage', () => {
    const result = parse('Tech Lead at Acme');
    expect(result.stage).toBeUndefined();
    expect(result.role).toBe('Tech Lead');
  });

  it('leaves the stage alone when nothing matches', () => {
    expect(parse('Frontend Developer at HubSpot').stage).toBeUndefined();
  });
});

describe('URLs', () => {
  it('extracts full and www URLs', () => {
    expect(parse('Applied at Acme https://acme.com/jobs/42').postingUrl)
      .toBe('https://acme.com/jobs/42');
    expect(parse('Applied at Acme www.acme.com/jobs').postingUrl).toBe('www.acme.com/jobs');
  });

  it('extracts a bare domain only when it carries a path', () => {
    expect(parse('Applied at Acme acme.com/jobs/42').postingUrl).toBe('acme.com/jobs/42');
    expect(parse('Engineer at Node.js Foundation').postingUrl).toBeUndefined();
  });

  it('drops trailing sentence punctuation', () => {
    expect(parse('Applied at Acme (https://acme.com/jobs/42).').postingUrl)
      .toBe('https://acme.com/jobs/42');
  });

  it('keeps the URL out of the company name', () => {
    expect(parse('Applied to SRE at Acme https://acme.com/jobs/42').company).toBe('Acme');
  });

  it('leaves punctuation after a URL so the next clause still splits off', () => {
    expect(parse('Applied to SRE at Acme acme.com/jobs/42, referred by Sam')).toMatchObject({
      role: 'SRE',
      company: 'Acme',
      postingUrl: 'acme.com/jobs/42',
      notes: 'referred by Sam',
    });
  });
});

describe('pasted job descriptions', () => {
  it('parses the first line and keeps the body as notes', () => {
    const result = parse(
      'Senior Backend Engineer at Stripe\n\nAbout the role\n- Build APIs\n- On-call rotation',
    );
    expect(result.role).toBe('Senior Backend Engineer');
    expect(result.company).toBe('Stripe');
    expect(result.notes).toBe('About the role\n- Build APIs\n- On-call rotation');
  });

  it('preserves line breaks in the body for markdown', () => {
    expect(parse('Dev at Acme\n\n# Heading\n\nBody text').notes).toContain('\n');
  });
});

describe('non-mutation of unmatched fields', () => {
  it('omits fields it could not determine rather than blanking them', () => {
    const { fields } = parseJobInput('yesterday', { today: TODAY });
    expect(fields).toEqual({ dateApplied: '2026-08-16' });
    expect('company' in fields).toBe(false);
    expect('stage' in fields).toBe(false);
  });
});

describe('applyParsedFields', () => {
  const BASELINE = { company: '', role: '', stage: 'Applied', notes: '' };

  it('fills matched fields and leaves the rest alone', () => {
    const values = { ...BASELINE, notes: 'existing' };
    expect(applyParsedFields(values, { company: 'Acme' }, { baseline: BASELINE }))
      .toEqual({ ...values, company: 'Acme' });
  });

  it('never overwrites a field the user edited by hand', () => {
    const values = { ...BASELINE, company: 'My Corp' };
    const next = applyParsedFields(values, { company: 'Acme', role: 'SRE' }, {
      touched: new Set(['company']),
      baseline: BASELINE,
    });
    expect(next.company).toBe('My Corp');
    expect(next.role).toBe('SRE');
  });

  it('reverts a field to baseline once the parser stops matching it', () => {
    const values = { ...BASELINE, company: 'Acme', role: 'SRE' };
    const next = applyParsedFields(values, { role: 'SRE' }, {
      parsed: new Set(['company', 'role']),
      baseline: BASELINE,
    });
    expect(next.company).toBe('');
    expect(next.role).toBe('SRE');
  });

  it('reverts stage to the column it was opened from, not a blank', () => {
    const baseline = { ...BASELINE, stage: 'Screening' };
    const next = applyParsedFields({ ...baseline, stage: 'Rejected' }, {}, {
      parsed: new Set(['stage']),
      baseline,
    });
    expect(next.stage).toBe('Screening');
  });

  it('does not revert a hand-edited field when the parser stops matching', () => {
    const values = { ...BASELINE, company: 'My Corp' };
    const next = applyParsedFields(values, {}, {
      parsed: new Set(['company']),
      touched: new Set(['company']),
      baseline: BASELINE,
    });
    expect(next.company).toBe('My Corp');
  });

  it('does not mutate the values it is given', () => {
    const values = { ...BASELINE };
    applyParsedFields(values, { company: 'Acme' }, { baseline: BASELINE });
    expect(values.company).toBe('');
  });
});
