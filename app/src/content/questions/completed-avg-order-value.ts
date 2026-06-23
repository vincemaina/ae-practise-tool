import type { Question } from '../types';

export const completedAvgOrderValue: Question = {
  id: 'q-completed-avg-order-value',
  slug: 'completed-avg-order-value',
  title: 'Average completed order value',
  prompt:
    'Across all completed orders, return the average order amount rounded to 2 decimal ' +
    'places as a single column named `avg_amount`.',
  difficulty: 'easy',
  packs: ['Core SQL Foundations'],
  dialects: ['generic'],
  datasetId: 'ecommerce',
  canonical: {
    generic: `
      SELECT ROUND(AVG(amount), 2) AS avg_amount
      FROM orders
      WHERE status = 'completed'
    `,
  },
  grading: {},
  hints: ["Filter to status = 'completed' first.", 'Use AVG(amount) and wrap it in ROUND(…, 2).'],
};
