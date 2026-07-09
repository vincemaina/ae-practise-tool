import type { Question } from '../types';

export const firstLastOrderAmount: Question = {
  id: 'q-first-last-order-amount',
  slug: 'first-last-order-amount',
  title: 'First and last completed order amount',
  prompt:
    'For each customer with completed orders, show the amount of their earliest and latest ' +
    'completed order (by date, breaking ties by order_id). Use FIRST_VALUE and LAST_VALUE. ' +
    'Columns: name, first_amount, last_amount — one row per customer. Order by name.',
  difficulty: 'hard',
  packs: ['Window Functions'],
  dialects: ['generic'],
  datasetId: 'ecommerce',
  canonical: {
    generic: `
      SELECT DISTINCT c.name,
             FIRST_VALUE(o.amount) OVER w AS first_amount,
             LAST_VALUE(o.amount) OVER w AS last_amount
      FROM customers c
      JOIN orders o ON o.customer_id = c.customer_id
      WHERE o.status = 'completed'
      WINDOW w AS (
        PARTITION BY c.name
        ORDER BY o.created_at, o.order_id
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
      )
      ORDER BY c.name
    `,
  },
  grading: { orderMatters: true },
  hints: [
    'LAST_VALUE needs the full-partition frame: ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING.',
    'Partition by customer, order by date; SELECT DISTINCT collapses to one row each.',
  ],
};
