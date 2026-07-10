import type { Question } from '../types';

export const sfLargestOrderPerCustomer: Question = {
  id: 'q-sf-largest-order-per-customer',
  slug: 'sf-largest-order-per-customer',
  title: 'Each customer’s biggest order (Snowflake QUALIFY)',
  prompt:
    "You're writing Snowflake SQL. Return each customer's single largest order — columns " +
    'order_id, customer_id, amount. Break ties by the smaller order_id. Use QUALIFY with ' +
    'ROW_NUMBER() (no subquery). Order by customer_id.',
  difficulty: 'medium',
  packs: ['Snowflake', 'Window Functions'],
  dialects: ['snowflake'],
  datasetId: 'ecommerce',
  canonical: {
    generic: `
      SELECT order_id, customer_id, amount
      FROM (
        SELECT order_id, customer_id, amount,
               ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY amount DESC, order_id) AS rn
        FROM orders
      ) ranked
      WHERE rn = 1
      ORDER BY customer_id
    `,
    snowflake: `
      SELECT order_id, customer_id, amount
      FROM orders
      QUALIFY ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY amount DESC, order_id) = 1
      ORDER BY customer_id
    `,
  },
  grading: { orderMatters: true },
  hints: [
    'ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY amount DESC, order_id) ranks each customer’s orders.',
    'QUALIFY filters on that window function directly — keep the rows where it equals 1.',
  ],
};
