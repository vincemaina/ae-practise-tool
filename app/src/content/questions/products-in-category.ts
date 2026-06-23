import type { Question } from '../types';

export const productsInCategory: Question = {
  id: 'q-products-in-category',
  slug: 'products-in-category',
  title: 'Hardware products by price',
  prompt:
    "List the name and price of every product in the 'Hardware' category, most expensive " +
    'first (break ties by name). Columns: name, price.',
  difficulty: 'easy',
  packs: ['Core SQL Foundations'],
  dialects: ['generic'],
  datasetId: 'ecommerce',
  canonical: {
    generic: `
      SELECT name, price
      FROM products
      WHERE category = 'Hardware'
      ORDER BY price DESC, name
    `,
  },
  grading: { orderMatters: true },
  hints: ["Filter with WHERE category = 'Hardware'.", 'ORDER BY price DESC, name.'],
};
