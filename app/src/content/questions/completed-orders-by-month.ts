import type { Question } from '../types';

export const completedOrdersByMonth: Question = {
  id: 'q-completed-orders-by-month',
  slug: 'completed-orders-by-month',
  title: 'Completed orders by month number',
  prompt:
    'Count completed orders per calendar month, using EXTRACT to pull the month number from ' +
    'created_at. Columns: month, orders. Order by month.',
  difficulty: 'easy',
  packs: ['Dates & Time'],
  dialects: ['generic'],
  datasetId: 'ecommerce',
  canonical: {
    generic: `
      SELECT EXTRACT(MONTH FROM created_at) AS month, COUNT(*) AS orders
      FROM orders
      WHERE status = 'completed'
      GROUP BY month
      ORDER BY month
    `,
  },
  grading: {},
  hints: [
    'EXTRACT(MONTH FROM created_at) returns the month number (1–12).',
    'Group by that expression and COUNT(*).',
  ],
};
