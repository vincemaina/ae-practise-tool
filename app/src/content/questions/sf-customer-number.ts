import type { Question } from '../types';

export const sfCustomerNumber: Question = {
  id: 'q-sf-customer-number',
  slug: 'sf-customer-number',
  title: 'Extract the number from a name (Snowflake REGEXP_SUBSTR)',
  prompt:
    "You're writing Snowflake SQL. The generic customers are named like \"Customer 12\". Using " +
    "Snowflake's REGEXP_SUBSTR, extract the numeric part of each generic customer's name and " +
    'return it as an integer. Columns: name, num. Order by num.',
  difficulty: 'medium',
  packs: ['Snowflake', 'Strings & regex'],
  dialects: ['snowflake'],
  datasetId: 'ecommerce',
  canonical: {
    generic: `
      SELECT name, CAST(regexp_extract(name, '[0-9]+') AS INTEGER) AS num
      FROM customers
      WHERE name LIKE 'Customer %'
      ORDER BY num
    `,
    snowflake: `
      SELECT name, CAST(REGEXP_SUBSTR(name, '[0-9]+') AS INTEGER) AS num
      FROM customers
      WHERE name LIKE 'Customer %'
      ORDER BY num
    `,
  },
  grading: { orderMatters: true },
  hints: [
    "REGEXP_SUBSTR(name, '[0-9]+') returns the first run of digits in the name.",
    'Wrap it in CAST(… AS INTEGER) so it sorts numerically.',
  ],
};
