import type { Question } from '../types';

export const semiJoinExistsCompleted: Question = {
  id: 'q-semi-join-exists-completed',
  slug: 'semi-join-exists-completed',
  title: 'Customers with a completed order (EXISTS)',
  prompt:
    'List the names of customers who have at least one completed order, using EXISTS (a ' +
    'semi-join) rather than a JOIN. Each customer should appear once. Order by name.',
  difficulty: 'medium',
  packs: ['Join Types'],
  dialects: ['generic'],
  datasetId: 'ecommerce',
  canonical: {
    generic: `
      SELECT c.name
      FROM customers c
      WHERE EXISTS (
        SELECT 1 FROM orders o
        WHERE o.customer_id = c.customer_id AND o.status = 'completed'
      )
      ORDER BY c.name
    `,
  },
  grading: { orderMatters: true },
  hints: [
    'EXISTS tests whether the subquery returns any row — without duplicating customers.',
    'Correlate the subquery on o.customer_id = c.customer_id and filter to completed.',
  ],
};
