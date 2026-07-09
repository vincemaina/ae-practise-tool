import type { Question } from '../types';

export const likeNamedCustomers: Question = {
  id: 'q-like-named-customers',
  slug: 'like-named-customers',
  title: 'Named customers (LIKE)',
  prompt:
    'Most customers have a generic name like "Customer 12". Using LIKE, return only the ' +
    '"named" customers — those whose name does NOT start with "Customer ". Single column name, ' +
    'alphabetical.',
  difficulty: 'easy',
  packs: ['Core SQL Foundations'],
  dialects: ['generic'],
  datasetId: 'ecommerce',
  canonical: {
    generic: `
      SELECT name
      FROM customers
      WHERE name NOT LIKE 'Customer %'
      ORDER BY name
    `,
  },
  grading: { orderMatters: true },
  hints: [
    'LIKE matches patterns; % is any run of characters.',
    "Exclude the generic names with WHERE name NOT LIKE 'Customer %'.",
  ],
};
