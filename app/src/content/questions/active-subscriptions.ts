import type { Question } from '../types';

export const activeSubscriptions: Question = {
  id: 'q-active-subscriptions',
  slug: 'active-subscriptions',
  title: 'Active subscriptions',
  prompt:
    'How many subscriptions are currently active (i.e. not cancelled — canceled_at IS NULL)? ' +
    'Single column active_subs.',
  difficulty: 'easy',
  packs: ['Core SQL Foundations'],
  dialects: ['generic'],
  datasetId: 'subscriptions',
  canonical: {
    generic: `
      SELECT COUNT(*) AS active_subs
      FROM subscriptions
      WHERE canceled_at IS NULL
    `,
  },
  grading: {},
  hints: ['Active means canceled_at IS NULL.', 'COUNT(*) the matching rows.'],
};
