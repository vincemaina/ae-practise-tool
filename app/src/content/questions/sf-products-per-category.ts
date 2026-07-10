import type { Question } from '../types';

export const sfProductsPerCategory: Question = {
  id: 'q-sf-products-per-category',
  slug: 'sf-products-per-category',
  title: 'List product names per category (Snowflake LISTAGG)',
  prompt:
    "You're writing Snowflake SQL. For each category, return a single comma-and-space separated " +
    "list of its product names in alphabetical order. Use Snowflake's LISTAGG … WITHIN GROUP. " +
    'Columns: category, products. Order by category.',
  difficulty: 'medium',
  packs: ['Snowflake', 'Joins & Aggregations'],
  dialects: ['snowflake'],
  datasetId: 'ecommerce',
  canonical: {
    generic: `
      SELECT category, STRING_AGG(name, ', ' ORDER BY name) AS products
      FROM products
      GROUP BY category
      ORDER BY category
    `,
    snowflake: `
      SELECT category, LISTAGG(name, ', ') WITHIN GROUP (ORDER BY name) AS products
      FROM products
      GROUP BY category
      ORDER BY category
    `,
  },
  grading: { orderMatters: true },
  requires: {
    pattern: /listagg/i,
    message: "Use Snowflake's LISTAGG … WITHIN GROUP, not STRING_AGG.",
  },
  hints: [
    "LISTAGG(name, ', ') concatenates the names in each group, separated by a comma and space.",
    'WITHIN GROUP (ORDER BY name) fixes the order inside each list so the result is stable.',
  ],
};
