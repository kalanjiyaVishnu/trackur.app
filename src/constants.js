export const MAX_TODOS = 10;

export const MAX_FOLLOWUPS = 50;

export const STAGES = [
  'Opportunity',
  'Applied',
  'Screening',
  'Interviewing',
  'Offer',
  'Rejected',
  'Ghosted',
  'Accepted',
];

export const STAGE_COLORS = {
  Opportunity: { badge: 'yellow' },
  Applied: { badge: 'blue' },
  Screening: { badge: 'purple' },
  Interviewing: { badge: 'orange' },
  Offer: { badge: 'green' },
  Rejected: { badge: 'red' },
  Ghosted: { badge: 'zinc' },
  Accepted: { badge: 'emerald' },
};

export const CHAR_LIMITS = {
  firstName: 40,
  lastName: 80,
  company: 100,
  role: 100,
  jobTitle: 100,
  // Notes are markdown — long enough for real write-ups, still bounded so a
  // paste-bomb can't blow up the row or the editor.
  notes: 20000,
  search: 250,
  todo: 150,
  email: 256,
  password: 256,
  postingUrl: 500,
  pocName: 100,
  pocRole: 100,
  pocEmail: 256,
  conversation: 5000,
};