import type { Question } from '../types';

export const sfProductTier: Question = {
  id: 'q-sf-product-tier',
  slug: 'sf-product-tier',
  title: 'Label products by tier (Snowflake IFF)',
  prompt:
    "You're writing Snowflake SQL. Using Snowflake's IFF() function, label each product " +
    "'premium' if its price is over 20, otherwise 'standard'. Columns: name, price, tier. " +
    'Order by name.',
  difficulty: 'easy',
  packs: ['Snowflake', 'Core SQL Foundations'],
  dialects: ['snowflake'],
  datasetId: 'ecommerce',
  canonical: {
    generic: `
      SELECT name, price,
             CASE WHEN price > 20 THEN 'premium' ELSE 'standard' END AS tier
      FROM products
      ORDER BY name
    `,
    snowflake: `
      SELECT name, price, IFF(price > 20, 'premium', 'standard') AS tier
      FROM products
      ORDER BY name
    `,
  },
  grading: { orderMatters: true },
  hints: [
    'IFF(condition, value_if_true, value_if_false) is Snowflake’s inline conditional.',
    "IFF(price > 20, 'premium', 'standard').",
  ],
};
