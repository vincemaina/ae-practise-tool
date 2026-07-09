import type { Question } from '../types';

export const exceptNoCompleted: Question = {
  id: 'q-except-no-completed',
  slug: 'except-no-completed',
  title: 'Ordered but never completed (EXCEPT)',
  prompt:
    'Using EXCEPT, return the customer_ids of customers who have placed at least one order but ' +
    'never a completed one. Single column customer_id, ordered ascending.',
  difficulty: 'medium',
  packs: ['Set Operations'],
  dialects: ['generic'],
  datasetId: 'ecommerce',
  canonical: {
    generic: `
      SELECT customer_id FROM orders
      EXCEPT
      SELECT customer_id FROM orders WHERE status = 'completed'
      ORDER BY customer_id
    `,
  },
  grading: { orderMatters: true },
  hints: [
    'EXCEPT returns rows from the first query that are not in the second.',
    'All customers with orders, minus those with a completed order.',
  ],
};
