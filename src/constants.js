export const MAX_TODOS = 10;

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
  notes: 250,
  search: 250,
  todo: 150,
  email: 256,
  password: 256,
  postingUrl: 500,
};