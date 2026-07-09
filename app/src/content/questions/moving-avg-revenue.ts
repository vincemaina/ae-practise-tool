import type { Question } from '../types';

export const movingAvgRevenue: Question = {
  id: 'q-moving-avg-revenue',
  slug: 'moving-avg-revenue',
  title: '3-day moving average of revenue',
  prompt:
    'For completed orders, compute each day’s revenue and a 3-day moving average (the current ' +
    'day plus the two prior days) using an explicit window frame. Columns: day, daily_revenue, ' +
    'moving_avg_3d (rounded to 2 decimals). Order by day.',
  difficulty: 'hard',
  packs: ['Window Functions'],
  dialects: ['generic'],
  datasetId: 'ecommerce',
  canonical: {
    generic: `
      WITH daily AS (
        SELECT created_at::DATE AS day, SUM(amount) AS daily_revenue
        FROM orders
        WHERE status = 'completed'
        GROUP BY day
      )
      SELECT day,
             daily_revenue,
             ROUND(AVG(daily_revenue) OVER (
               ORDER BY day ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
             ), 2) AS moving_avg_3d
      FROM daily
      ORDER BY day
    `,
  },
  grading: { orderMatters: true },
  hints: [
    'Aggregate revenue per day in a CTE first.',
    'A moving average uses an explicit frame: AVG(...) OVER (ORDER BY day ROWS BETWEEN 2 PRECEDING AND CURRENT ROW).',
  ],
};
