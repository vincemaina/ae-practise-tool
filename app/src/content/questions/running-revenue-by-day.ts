import type { Question } from '../types';

export const runningRevenueByDay: Question = {
  id: 'q-running-revenue-by-day',
  slug: 'running-revenue-by-day',
  title: 'Running daily revenue',
  prompt:
    'For completed orders, return each day with that day’s revenue and a cumulative running ' +
    'total over time. Columns: day, daily_revenue, running_total. One row per day, ordered ' +
    'by day.',
  difficulty: 'hard',
  packs: ['Window Functions'],
  dialects: ['generic'],
  datasetId: 'ecommerce',
  canonical: {
    generic: `
      SELECT created_at::DATE AS day,
             SUM(amount) AS daily_revenue,
             SUM(SUM(amount)) OVER (ORDER BY created_at::DATE) AS running_total
      FROM orders
      WHERE status = 'completed'
      GROUP BY created_at::DATE
      ORDER BY day
    `,
  },
  grading: { orderMatters: true },
  hints: [
    'Group by created_at::DATE for daily revenue.',
    'A running total is SUM(daily_revenue) OVER (ORDER BY day) — i.e. SUM(SUM(amount)) OVER (...).',
  ],
};
