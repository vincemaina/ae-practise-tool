import type { Question } from '../types';

export const distinctPurchasers: Question = {
  id: 'q-distinct-purchasers',
  slug: 'distinct-purchasers',
  title: 'Distinct purchasers',
  prompt:
    "How many distinct users have at least one 'purchase' event? Return a single column " +
    '`purchasers`. (Note: the event stream contains duplicate rows.)',
  difficulty: 'easy',
  packs: ['Core SQL Foundations'],
  dialects: ['generic'],
  datasetId: 'events',
  canonical: {
    generic: `
      SELECT COUNT(DISTINCT user_id) AS purchasers
      FROM events
      WHERE event_name = 'purchase'
    `,
  },
  grading: {},
  hints: ["Filter to event_name = 'purchase'.", 'COUNT(DISTINCT user_id) ignores duplicates.'],
};
