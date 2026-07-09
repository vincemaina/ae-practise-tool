import type { Question } from '../types';

export const repeatCustomers: Question = {
  id: 'q-repeat-customers',
  slug: 'repeat-customers',
  title: 'Repeat customers',
  prompt:
    'Find customers with two or more completed orders. Return their name and ' +
    'completed_orders count, most orders first (break ties by name).',
  difficulty: 'medium',
  packs: ['Joins & Aggregations'],
  dialects: ['generic'],
  datasetId: 'ecommerce',
  canonical: {
    generic: `
      SELECT c.name, COUNT(*) AS completed_orders
      FROM customers c
      JOIN orders o ON o.customer_id = c.customer_id
      WHERE o.status = 'completed'
      GROUP BY c.name
      HAVING COUNT(*) >= 2
      ORDER BY completed_orders DESC, c.name
    `,
  },
  grading: { orderMatters: true },
  hints: ['Count completed orders per customer.', 'Filter groups with HAVING COUNT(*) >= 2.'],
};
