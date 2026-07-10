import type { Question } from '../types';

export const sfGenericCustomers: Question = {
  id: 'q-sf-generic-customers',
  slug: 'sf-generic-customers',
  title: 'Customers whose name starts with a prefix (Snowflake STARTSWITH)',
  prompt:
    "You're writing Snowflake SQL. Using Snowflake's STARTSWITH function, return the customers " +
    "whose name begins with 'Customer'. Columns: customer_id, name. Order by customer_id.",
  difficulty: 'easy',
  packs: ['Snowflake', 'Strings & regex'],
  dialects: ['snowflake'],
  datasetId: 'ecommerce',
  canonical: {
    generic: `
      SELECT customer_id, name
      FROM customers
      WHERE starts_with(name, 'Customer')
      ORDER BY customer_id
    `,
    snowflake: `
      SELECT customer_id, name
      FROM customers
      WHERE STARTSWITH(name, 'Customer')
      ORDER BY customer_id
    `,
  },
  grading: { orderMatters: true },
  hints: [
    "STARTSWITH(name, 'Customer') is TRUE when name begins with that prefix.",
    'Use it in the WHERE clause to keep only those rows.',
  ],
};
