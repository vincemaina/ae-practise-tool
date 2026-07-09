import type { Question } from '../types';

export const intersectCompletedAndRefunded: Question = {
  id: 'q-intersect-completed-and-refunded',
  slug: 'intersect-completed-and-refunded',
  title: 'Both completed and refunded (INTERSECT)',
  prompt:
    'Using INTERSECT, return the customer_ids of customers who have BOTH a completed order and ' +
    'a refunded order. Single column customer_id, ordered ascending.',
  difficulty: 'medium',
  packs: ['Set Operations'],
  dialects: ['generic'],
  datasetId: 'ecommerce',
  canonical: {
    generic: `
      SELECT customer_id FROM orders WHERE status = 'completed'
      INTERSECT
      SELECT customer_id FROM orders WHERE status = 'refunded'
      ORDER BY customer_id
    `,
  },
  grading: { orderMatters: true },
  hints: [
    'INTERSECT returns rows present in both queries.',
    'One set = customers with a completed order; the other = customers with a refunded order.',
  ],
};
