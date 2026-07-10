import type { Question } from '../types';

export const sfTopProducts: Question = {
  id: 'q-sf-top-products',
  slug: 'sf-top-products',
  title: 'Five priciest products (Snowflake TOP)',
  prompt:
    "You're writing Snowflake SQL. Snowflake supports TOP n as an alternative to LIMIT. Return " +
    'the 5 most expensive products — columns name, price — using TOP, breaking ties by name.',
  difficulty: 'easy',
  packs: ['Snowflake'],
  dialects: ['snowflake'],
  datasetId: 'ecommerce',
  canonical: {
    generic: `
      SELECT name, price
      FROM products
      ORDER BY price DESC, name
      LIMIT 5
    `,
    snowflake: `
      SELECT TOP 5 name, price
      FROM products
      ORDER BY price DESC, name
    `,
  },
  grading: { orderMatters: true },
  requires: {
    pattern: /\btop\s+\d/i,
    message: 'This question is about TOP n — use SELECT TOP 5, not LIMIT.',
  },
  hints: [
    'SELECT TOP 5 … goes right after SELECT, before the column list.',
    'Still order the rows with ORDER BY price DESC, name.',
  ],
};
