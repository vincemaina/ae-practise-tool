import type { Question } from '../types';

export const arpuActive: Question = {
  id: 'q-arpu-active',
  slug: 'arpu-active',
  title: 'ARPU of active subscriptions',
  prompt:
    'What is the average MRR across active subscriptions (canceled_at IS NULL), rounded to 2 ' +
    'decimals? Single column arpu.',
  difficulty: 'easy',
  packs: ['Core SQL Foundations'],
  dialects: ['generic'],
  datasetId: 'subscriptions',
  canonical: {
    generic: `
      SELECT ROUND(AVG(mrr), 2) AS arpu
      FROM subscriptions
      WHERE canceled_at IS NULL
    `,
  },
  grading: {},
  hints: ['Filter to active subs.', 'AVG(mrr) rounded to 2 decimals.'],
};
