import type { Question } from '../types';

export const customersWithoutCompletedOrders: Question = {
  id: 'q-customers-without-completed-orders',
  slug: 'customers-without-completed-orders',
  title: 'Customers with no completed orders',
  prompt:
    'List the names of customers who have never placed a completed order (they may have ' +
    'cancelled/refunded orders, or none at all). Return a single column `name`, alphabetical.',
  difficulty: 'medium',
  packs: ['CTEs & Subqueries'],
  dialects: ['generic'],
  datasetId: 'ecommerce',
  canonical: {
    generic: `
      SELECT name
      FROM customers
      WHERE customer_id NOT IN (
        SELECT customer_id FROM orders WHERE status = 'completed'
      )
      ORDER BY name
    `,
  },
  grading: { orderMatters: true },
  hints: [
    'Find the set of customers who DO have a completed order first.',
    'Then select customers not in that set (NOT IN, or a LEFT JOIN … IS NULL).',
  ],
};
