import type { Question } from '../types';

export const signupsByMonthCohort: Question = {
  id: 'q-signups-by-month-cohort',
  slug: 'signups-by-month-cohort',
  title: 'Signups by month cohort',
  prompt:
    'Group subscriptions into monthly signup cohorts by started_at. Return the cohort month ' +
    "(date_trunc('month', started_at)::DATE) and the number of signups. Columns: month, " +
    'signups. Order by month.',
  difficulty: 'hard',
  packs: ['Cohorts'],
  dialects: ['generic'],
  datasetId: 'subscriptions',
  canonical: {
    generic: `
      SELECT date_trunc('month', started_at)::DATE AS month, COUNT(*) AS signups
      FROM subscriptions
      GROUP BY month
      ORDER BY month
    `,
  },
  grading: { orderMatters: true },
  hints: [
    "date_trunc('month', started_at) collapses each date to the first of its month.",
    'Group by that and COUNT(*).',
  ],
};
