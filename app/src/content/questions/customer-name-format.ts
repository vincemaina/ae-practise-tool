import type { Question } from '../types';

export const customerNameFormat: Question = {
  id: 'q-customer-name-format',
  slug: 'customer-name-format',
  title: 'Uppercase name and its length',
  prompt:
    'For the "named" customers (whose name does not start with "Customer "), return their name ' +
    'in uppercase and the number of characters in the name, using string functions. Columns: ' +
    'name_upper, name_length. Order by name_upper.',
  difficulty: 'easy',
  packs: ['Core SQL Foundations'],
  dialects: ['generic'],
  datasetId: 'ecommerce',
  canonical: {
    generic: `
      SELECT UPPER(name) AS name_upper, LENGTH(name) AS name_length
      FROM customers
      WHERE name NOT LIKE 'Customer %'
      ORDER BY name_upper
    `,
  },
  grading: { orderMatters: true },
  hints: [
    'UPPER(name) upper-cases the string; LENGTH(name) counts its characters.',
    "Restrict to named customers with WHERE name NOT LIKE 'Customer %'.",
  ],
};
