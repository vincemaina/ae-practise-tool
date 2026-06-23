import type { Question } from '../types';

export const secondHighestOrder: Question = {
  id: 'q-second-highest-order',
  slug: 'second-highest-order',
  title: 'Second-highest completed order',
  prompt:
    'Return the amount of the second-highest completed order (by amount) as a single column ' +
    'second_highest. You can assume the completed amounts are distinct.',
  difficulty: 'medium',
  packs: ['CTEs & Subqueries'],
  dialects: ['generic'],
  datasetId: 'ecommerce',
  canonical: {
    generic: `
      SELECT amount AS second_highest
      FROM orders
      WHERE status = 'completed'
      ORDER BY amount DESC
      LIMIT 1 OFFSET 1
    `,
  },
  grading: {},
  hints: ['Order completed amounts descending.', 'Skip the first row with OFFSET 1, take LIMIT 1.'],
};
