import type { Question } from '../types';

export const ordersByStatus: Question = {
  id: 'q-orders-by-status',
  slug: 'orders-by-status',
  title: 'Orders by status',
  prompt:
    'Count the number of orders for each status. Return two columns, `status` and ' +
    '`order_count`, ordered by `order_count` descending and then `status` alphabetically.',
  difficulty: 'easy',
  packs: ['Core SQL Foundations'],
  dialects: ['generic'],
  datasetId: 'ecommerce',
  canonical: {
    generic: `
      SELECT status, COUNT(*) AS order_count
      FROM orders
      GROUP BY status
      ORDER BY order_count DESC, status
    `,
  },
  grading: { orderMatters: true },
  hints: ['Group by the status column.', 'COUNT(*) counts rows in each group.'],
};
