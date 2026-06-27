import type { Question } from '../types';

export const customerSpendRank: Question = {
  id: 'q-customer-spend-rank',
  slug: 'customer-spend-rank',
  title: 'Rank customers by spend',
  prompt:
    'Using completed orders (orders.amount), rank customers by total spend with a window ' +
    'function (1 = highest spender). Customers with equal spend share the same rank. ' +
    'Return name, total, and spend_rank, ordered by spend_rank then name. Only include ' +
    'customers with at least one completed order.',
  difficulty: 'hard',
  packs: ['Window Functions'],
  dialects: ['generic'],
  datasetId: 'ecommerce',
  canonical: {
    generic: `
      SELECT c.name,
             SUM(o.amount) AS total,
             RANK() OVER (ORDER BY SUM(o.amount) DESC) AS spend_rank
      FROM customers c
      JOIN orders o ON o.customer_id = c.customer_id
      WHERE o.status = 'completed'
      GROUP BY c.name
      ORDER BY spend_rank, c.name
    `,
  },
  grading: { orderMatters: true },
  hints: [
    'Aggregate spend per customer first, then apply RANK() OVER (ORDER BY total DESC).',
    'You can use an aggregate inside the window’s ORDER BY when you GROUP BY.',
  ],
};
