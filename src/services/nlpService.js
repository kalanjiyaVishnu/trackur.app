import { STAGES, CHAR_LIMITS } from '../constants.js';

/**
 * Rules-based parser for the quick-add box. Turns a line like
 *
 *   "Applied to Senior Frontend Dev at HubSpot yesterday hubspot.com/jobs/9"
 *
 * into { role, company, dateApplied, stage, postingUrl, notes }.
 *
 * Deliberately local, dependency-free, and heuristic: a job search is personal
 * data, so nothing here leaves the browser. Anything it can't confidently place
 * is preserved in `notes` rather than dropped — including emails and salaries,
 * which have no field on the add form.
 */

// --- date ------------------------------------------------------------------

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

// Matches full names and the usual abbreviations ("sep", "sept", "sep.").
const MONTH_PATTERN = 'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec';

function monthIndex(token) {
  const prefix = token.slice(0, 3).toLowerCase();
  return MONTHS.findIndex((m) => m.startsWith(prefix));
}

/** YYYY-MM-DD in the user's local timezone, matching what <input type="date"> expects. */
function toISODate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Whether the user's locale writes the day before the month (15/08 vs 08/15).
 * Only consulted when the numbers themselves can't disambiguate.
 */
function localeWritesDayFirst() {
  try {
    const parts = new Intl.DateTimeFormat(undefined, {
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date(Date.UTC(2020, 0, 2)));
    return parts.findIndex((p) => p.type === 'day') < parts.findIndex((p) => p.type === 'month');
  } catch {
    return false;
  }
}

/**
 * Resolves a year-less date. Job entries look backwards, so a date that would
 * land more than a month in the future is read as last year's instead.
 */
function resolveYear(month, day, today) {
  const candidate = new Date(today.getFullYear(), month, day);
  if (candidate - today > 31 * 24 * 60 * 60 * 1000) {
    return new Date(today.getFullYear() - 1, month, day);
  }
  return candidate;
}

function expandYear(raw) {
  if (raw == null) return null;
  const year = Number(raw);
  return raw.length <= 2 ? 2000 + year : year;
}

/** True when the calendar actually has this day (rejects 31 Feb, month 13, ...). */
function isRealDate(date, month, day) {
  return date.getMonth() === month && date.getDate() === day;
}

/**
 * Ordered date matchers. Each returns a Date, or null when the text matched the
 * shape but not a real calendar date (e.g. "45/13"), in which case the match is
 * left in place for `notes`.
 */
const DATE_RULES = [
  // 2026-08-15
  {
    pattern: /\b(\d{4})-(\d{2})-(\d{2})\b/,
    build: ([, y, m, d]) => {
      const date = new Date(Number(y), Number(m) - 1, Number(d));
      return isRealDate(date, Number(m) - 1, Number(d)) ? date : null;
    },
  },
  // today / yesterday / tomorrow
  {
    pattern: /\b(today|yesterday|tomorrow)\b/i,
    build: ([, word], today) =>
      addDays(today, { today: 0, yesterday: -1, tomorrow: 1 }[word.toLowerCase()]),
  },
  // 3 days ago, a week ago, two months ago
  {
    pattern: /\b(\d{1,3}|a|an|one|two|three|four|five|six)\s+(day|week|month)s?\s+ago\b/i,
    build: ([, count, unit], today) => {
      const words = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
      const n = words[count.toLowerCase()] ?? Number(count);
      const lower = unit.toLowerCase();
      if (lower === 'month') {
        const d = new Date(today);
        d.setMonth(d.getMonth() - n);
        return d;
      }
      return addDays(today, -n * (lower === 'week' ? 7 : 1));
    },
  },
  // next Monday
  {
    pattern: new RegExp(`\\bnext\\s+(${WEEKDAYS.join('|')})\\b`, 'i'),
    build: ([, name], today) => {
      const target = WEEKDAYS.indexOf(name.toLowerCase());
      return addDays(today, (target - today.getDay() + 7) % 7 || 7);
    },
  },
  // last Monday / on Monday / Monday — all read as the most recent one
  {
    pattern: new RegExp(`\\b(?:last\\s+|this\\s+|on\\s+)?(${WEEKDAYS.join('|')})\\b`, 'i'),
    build: ([, name], today) => {
      const target = WEEKDAYS.indexOf(name.toLowerCase());
      return addDays(today, -((today.getDay() - target + 7) % 7));
    },
  },
  // Aug 15 / August 15th, 2026 / Sept. 3
  {
    pattern: new RegExp(`\\b(${MONTH_PATTERN})[a-z]*\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(\\d{4}))?\\b`, 'i'),
    build: ([, monthToken, dayToken, yearToken], today) => {
      const month = monthIndex(monthToken);
      const day = Number(dayToken);
      const date = yearToken
        ? new Date(Number(yearToken), month, day)
        : resolveYear(month, day, today);
      return isRealDate(date, month, day) ? date : null;
    },
  },
  // 15 August / 3rd Sept 2026
  {
    pattern: new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_PATTERN})[a-z]*\\.?(?:,?\\s*(\\d{4}))?\\b`, 'i'),
    build: ([, dayToken, monthToken, yearToken], today) => {
      const month = monthIndex(monthToken);
      const day = Number(dayToken);
      const date = yearToken
        ? new Date(Number(yearToken), month, day)
        : resolveYear(month, day, today);
      return isRealDate(date, month, day) ? date : null;
    },
  },
  // 15/08, 08-15-2026, 15.8.26 — order from the numbers, else from the locale
  {
    pattern: /\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/,
    build: ([, first, second, yearToken], today) => {
      const a = Number(first);
      const b = Number(second);
      let day;
      let month;
      if (a > 12 && b <= 12) {
        [day, month] = [a, b];
      } else if (b > 12 && a <= 12) {
        [month, day] = [a, b];
      } else if (localeWritesDayFirst()) {
        [day, month] = [a, b];
      } else {
        [month, day] = [a, b];
      }
      month -= 1;
      const year = expandYear(yearToken);
      const date = year == null ? resolveYear(month, day, today) : new Date(year, month, day);
      return isRealDate(date, month, day) ? date : null;
    },
  },
];

// --- stage -----------------------------------------------------------------

// Longest phrases win, so "phone screen" beats "screen". Note the absence of
// "lead": it collides with job titles ("Tech Lead") far more often than it
// means an Opportunity.
const STAGE_KEYWORDS = [
  ['opportunity', 'Opportunity'],
  ['wishlist', 'Opportunity'],
  ['bookmarked', 'Opportunity'],
  ['saved', 'Opportunity'],
  ['applied', 'Applied'],
  ['application sent', 'Applied'],
  ['submitted', 'Applied'],
  ['phone screen', 'Screening'],
  ['recruiter call', 'Screening'],
  ['recruiter screen', 'Screening'],
  ['hr screen', 'Screening'],
  ['screening', 'Screening'],
  ['screened', 'Screening'],
  ['interviewing', 'Interviewing'],
  ['interviewed', 'Interviewing'],
  ['interview', 'Interviewing'],
  ['final round', 'Interviewing'],
  ['onsite', 'Interviewing'],
  ['offered', 'Offer'],
  ['offer', 'Offer'],
  ['rejected', 'Rejected'],
  ['rejection', 'Rejected'],
  ['turned down', 'Rejected'],
  ['ghosted', 'Ghosted'],
  ['no response', 'Ghosted'],
  ['accepted', 'Accepted'],
  ['signed', 'Accepted'],
]
  // Drop anything that isn't a real stage, so renaming a stage in constants.js
  // can't silently start writing an invalid value into the form.
  .filter(([, stage]) => STAGES.includes(stage))
  .sort((a, b) => b[0].length - a[0].length);

// --- role vs company -------------------------------------------------------

// Words that mark a phrase as a job title rather than an employer. Used only to
// break ties on ambiguous separators ("HubSpot - Frontend Developer").
const ROLE_WORDS = new Set([
  'engineer', 'engineering', 'developer', 'dev', 'programmer', 'designer', 'architect',
  'analyst', 'scientist', 'researcher', 'manager', 'director', 'head', 'chief', 'officer',
  'president', 'vp', 'executive', 'consultant', 'specialist', 'coordinator', 'administrator',
  'associate', 'assistant', 'intern', 'internship', 'trainee', 'apprentice', 'technician',
  'strategist', 'editor', 'writer', 'producer', 'planner', 'supervisor', 'accountant',
  'recruiter', 'teacher', 'nurse', 'therapist', 'attorney', 'paralegal', 'representative',
  'frontend', 'front-end', 'backend', 'back-end', 'fullstack', 'full-stack', 'software',
  'data', 'devops', 'sre', 'qa', 'ux', 'ui', 'product', 'project', 'program', 'marketing',
  'sales', 'security', 'cloud', 'mobile', 'android', 'ios', 'web', 'senior', 'junior',
  'staff', 'principal', 'lead',
]);

function looksLikeRole(text) {
  return text
    .toLowerCase()
    .split(/[^a-z-]+/)
    .some((word) => word && ROLE_WORDS.has(word));
}

// --- helpers ---------------------------------------------------------------

function squash(text) {
  return text.replace(/\s+/g, ' ').trim();
}

/** Trims connective words and punctuation left behind by an extraction. */
function tidy(text) {
  return squash(text)
    .replace(/^[\s,;:.\-–—|@/]+/, '')
    .replace(/[\s,;:.\-–—|@/]+$/, '')
    .trim();
}

const LEADING_CONNECTORS = /^(?:to|for|as|at|with|@|a|an|the|from|in|on|role|position|job)\b[\s,]*/i;

function stripLeadingConnectors(text) {
  let out = text;
  let previous;
  do {
    previous = out;
    out = out.replace(LEADING_CONNECTORS, '').trimStart();
  } while (out !== previous);
  return out;
}

function cap(value, limit) {
  return value.length > limit ? value.slice(0, limit).trim() : value;
}

// --- extractors ------------------------------------------------------------

// Full URLs, www.-prefixed hosts, or a bare domain that carries a path. The
// path requirement stops company names and "Node.js" from being read as links.
const URL_PATTERN =
  /\bhttps?:\/\/\S+|\bwww\.[a-z0-9-]+(?:\.[a-z0-9-]+)+\S*|\b[a-z0-9-]+(?:\.[a-z0-9-]+)+\/\S*/i;

function extractUrl(text) {
  const match = text.match(URL_PATTERN);
  if (!match) return { value: null, rest: text };
  const value = match[0].replace(/[.,;:)]+$/, '');
  // Put the trailing punctuation back: a comma after a link still separates
  // clauses, and dropping it would glue the next phrase onto the company name.
  const trailing = match[0].slice(value.length);
  return { value, rest: text.replace(match[0], ` ${trailing}`) };
}

function extractDate(text, today) {
  for (const { pattern, build } of DATE_RULES) {
    const match = text.match(pattern);
    if (!match) continue;
    const date = build(match, today);
    // Shape matched but the calendar date is impossible — leave it for notes.
    if (!date || Number.isNaN(date.getTime())) continue;
    return { value: toISODate(date), rest: text.replace(match[0], ' ') };
  }
  return { value: null, rest: text };
}

function extractStage(text) {
  let best = null;
  for (const [keyword, stage] of STAGE_KEYWORDS) {
    const match = text.match(new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'i'));
    if (!match) continue;
    // Earliest mention wins; ties go to the longer phrase, which sorting gave us first.
    if (!best || match.index < best.index) {
      best = { index: match.index, matched: match[0], stage };
    }
  }
  if (!best) return { value: null, rest: text };
  return { value: best.stage, rest: text.replace(best.matched, ' ') };
}

/**
 * Cuts a field value at the first comma or semicolon. Titles and employers
 * rarely contain one, so the tail is almost always an aside ("...,
 * referred by Sam") that belongs in notes instead.
 */
function splitTail(value) {
  const index = value.search(/[,;]/);
  if (index === -1) return { head: value, tail: '' };
  return { head: tidy(value.slice(0, index)), tail: tidy(value.slice(index + 1)) };
}

/**
 * Splits the remaining text into a role and a company, plus whatever is left
 * over for notes.
 *
 * "at" and "@" put the role first; "for" puts it second; dashes and pipes are
 * ambiguous, so the side that reads like a job title wins.
 */
function extractRoleAndCompany(text) {
  const cleaned = tidy(stripLeadingConnectors(text));
  const empty = { role: null, company: null, rest: '' };
  if (!cleaned) return empty;

  // Packages a left/right split, moving trailing asides into `rest`.
  const pair = (roleSide, companySide, extra = '') => {
    const role = splitTail(tidy(roleSide));
    const company = splitTail(tidy(companySide));
    return {
      role: role.head || null,
      company: company.head || null,
      rest: tidy([role.tail, company.tail, extra].filter(Boolean).join(', ')),
    };
  };

  const strong = cleaned.match(/^(.*?)\s+(?:at|@)\s+(.*)$/i);
  if (strong) {
    const role = tidy(strong[1]);
    const company = tidy(strong[2]);
    // A trailing "for" clause names the role: "with Google for Senior SWE".
    const trailing = company.match(/^(.*?)\s+for\s+(.*)$/i);
    if (trailing) {
      return role
        // Role already known, so the clause is an aside ("at Google for the platform team").
        ? pair(role, trailing[1], trailing[2])
        : pair(trailing[2], trailing[1]);
    }
    return pair(role, company);
  }

  const forClause = cleaned.match(/^(.*?)\s+for\s+(.*)$/i);
  if (forClause) return pair(forClause[2], forClause[1]);

  const weak =
    cleaned.match(/^(.*?)\s+[-–—|]\s+(.*)$/) || cleaned.match(/^(.*?)\s*[|–—]\s*(.*)$/);
  if (weak) {
    const left = tidy(weak[1]);
    const right = tidy(weak[2]);
    if (left && right) {
      // Prefer the side that names a job title; default to "role first".
      return !looksLikeRole(left) && looksLikeRole(right) ? pair(right, left) : pair(left, right);
    }
  }

  // A single phrase: a job title if it reads like one, otherwise an employer.
  const { head, tail } = splitTail(cleaned);
  if (!head) return empty;
  return looksLikeRole(head)
    ? { role: head, company: null, rest: tail }
    : { role: null, company: head, rest: tail };
}

// --- public API ------------------------------------------------------------

/**
 * Parses free-form text into add-form field values.
 *
 * Only fields the parser is confident about are present in `fields`; callers
 * should leave everything else untouched rather than clearing it.
 *
 * @param {string} input      Raw text from the quick-add box.
 * @param {object} [options]
 * @param {Date}   [options.today] Reference date for relative phrases. Injectable for tests.
 * @returns {{ fields: object, matched: string[] }}
 */
export function parseJobInput(input, { today = new Date() } = {}) {
  const raw = (input || '').trim();
  if (!raw) return { fields: {}, matched: [] };

  const reference = startOfDay(today);

  // A pasted job description: parse the headline, keep the body as notes.
  // The body keeps its line breaks — notes are rendered as markdown.
  const lines = raw.split(/\r?\n/);
  const headlineIndex = lines.findIndex((line) => line.trim());
  const headline = headlineIndex === -1 ? '' : lines[headlineIndex];
  const body = lines.slice(headlineIndex + 1).join('\n').trim();

  let rest = squash(headline);
  const fields = {};

  const url = extractUrl(rest);
  rest = url.rest;
  if (url.value) fields.postingUrl = url.value;

  const date = extractDate(rest, reference);
  rest = date.rest;
  if (date.value) fields.dateApplied = date.value;

  const stage = extractStage(rest);
  rest = stage.rest;
  if (stage.value) fields.stage = stage.value;

  const { role, company, rest: leftover } = extractRoleAndCompany(rest);
  if (role) fields.role = cap(role, CHAR_LIMITS.role);
  if (company) fields.company = cap(company, CHAR_LIMITS.company);

  // Everything the parser couldn't place is preserved rather than discarded.
  const notes = [tidy(leftover), body].filter(Boolean).join('\n\n').trim();
  if (notes) fields.notes = cap(notes, CHAR_LIMITS.notes);

  return { fields, matched: Object.keys(fields) };
}

/**
 * Merges a parse result into the current form values.
 *
 * Two rules keep live parsing from fighting the user:
 *   - a field the user edited by hand is never overwritten;
 *   - a field the parser filled last time but no longer matches reverts to the
 *     baseline, so deleting words from the box takes their values with them.
 *
 * @param {object} values            Current form values.
 * @param {object} fields            `fields` from parseJobInput.
 * @param {object} [options]
 * @param {Set<string>} [options.parsed]  Fields the parser filled on the previous pass.
 * @param {Set<string>} [options.touched] Fields the user has edited by hand.
 * @param {object} [options.baseline]     Values an unparsed form starts from.
 * @returns {object} The next form values.
 */
export function applyParsedFields(
  values,
  fields,
  { parsed = new Set(), touched = new Set(), baseline = {} } = {},
) {
  const next = { ...values };
  for (const name of parsed) {
    if (!(name in fields) && !touched.has(name)) {
      next[name] = baseline[name] ?? '';
    }
  }
  for (const [name, value] of Object.entries(fields)) {
    if (!touched.has(name)) next[name] = value;
  }
  return next;
}
