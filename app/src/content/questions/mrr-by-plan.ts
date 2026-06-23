import type { Question } from '../types';

export const mrrByPlan: Question = {
  id: 'q-mrr-by-plan',
  slug: 'mrr-by-plan',
  title: 'MRR by plan (active)',
  prompt:
    'For active subscriptions only (canceled_at IS NULL), return total MRR per plan, highest ' +
    'first. Columns: plan, mrr.',
  difficulty: 'medium',
  packs: ['Joins & Aggregations'],
  dialects: ['generic'],
  datasetId: 'subscriptions',
  canonical: {
    generic: `
      SELECT plan, SUM(mrr) AS mrr
      FROM subscriptions
      WHERE canceled_at IS NULL
      GROUP BY plan
      ORDER BY mrr DESC
    `,
  },
  grading: { orderMatters: true },
  hints: ['Filter to active subs first.', 'SUM(mrr) grouped by plan, ordered descending.'],
};
