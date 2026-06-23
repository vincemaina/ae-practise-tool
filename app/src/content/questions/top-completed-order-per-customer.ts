import type { Question } from '../types';

export const topCompletedOrderPerCustomer: Question = {
  id: 'q-top-completed-order-per-customer',
  slug: 'top-completed-order-per-customer',
  title: 'Largest completed order per customer',
  prompt:
    'For each customer with at least one completed order, return their single largest ' +
    'completed order: columns `name`, `order_id`, `amount` — exactly one row per customer ' +
    '(their highest-amount completed order). Order by `amount` descending.',
  difficulty: 'hard',
  packs: ['Window Functions'],
  dialects: ['generic'],
  datasetId: 'ecommerce',
  canonical: {
    generic: `
      SELECT c.name, o.order_id, o.amount
      FROM customers c
      JOIN orders o ON o.customer_id = c.customer_id
      WHERE o.status = 'completed'
      QUALIFY ROW_NUMBER() OVER (PARTITION BY c.customer_id ORDER BY o.amount DESC) = 1
      ORDER BY o.amount DESC
    `,
  },
  grading: { orderMatters: true },
  hints: [
    'Rank each customer’s completed orders by amount with ROW_NUMBER() OVER (PARTITION BY …).',
    'Keep only rank 1. DuckDB supports QUALIFY to filter on a window function directly.',
  ],
};
