import type { Question } from '../types';

export const signupMomGrowth: Question = {
  id: 'q-signup-mom-growth',
  slug: 'signup-mom-growth',
  title: 'Month-over-month signup change',
  prompt:
    'For each signup month (by started_at), return the number of signups and the ' +
    'month-over-month change (this month minus the previous month; NULL for the first ' +
    'month). Columns: month, signups, mom_change. Order by month.',
  difficulty: 'hard',
  packs: ['Window Functions'],
  dialects: ['generic'],
  datasetId: 'subscriptions',
  canonical: {
    generic: `
      WITH monthly AS (
        SELECT date_trunc('month', started_at)::DATE AS month, COUNT(*) AS signups
        FROM subscriptions
        GROUP BY month
      )
      SELECT month,
             signups,
             signups - LAG(signups) OVER (ORDER BY month) AS mom_change
      FROM monthly
      ORDER BY month
    `,
  },
  grading: { orderMatters: true },
  hints: [
    'First aggregate signups per month in a CTE.',
    'Then LAG(signups) OVER (ORDER BY month) gives the previous month’s count to subtract.',
  ],
};
