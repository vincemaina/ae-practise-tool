import type { Question } from '../types';

export const secondHighestOrder: Question = {
  id: 'q-second-highest-order',
  slug: 'second-highest-order',
  title: 'Second-highest completed order',
  prompt:
    'Return the second-highest **distinct** completed order amount as a single column ' +
    'second_highest. (If several orders share the top amount, they count as one.)',
  difficulty: 'medium',
  packs: ['CTEs & Subqueries'],
  dialects: ['generic'],
  datasetId: 'ecommerce',
  canonical: {
    generic: `
      SELECT DISTINCT amount AS second_highest
      FROM orders
      WHERE status = 'completed'
      ORDER BY second_highest DESC
      LIMIT 1 OFFSET 1
    `,
  },
  grading: {},
  hints: [
    'Use SELECT DISTINCT amount so repeated amounts collapse to one.',
    'Order descending, then skip the first with OFFSET 1 and take LIMIT 1.',
  ],
};
