import type { Question } from '../types';

export const selfJoinProductPairs: Question = {
  id: 'q-self-join-product-pairs',
  slug: 'self-join-product-pairs',
  title: 'Cheaper/pricier product pairs in a category',
  prompt:
    'Within each product category, find every pair of products where the first is strictly ' +
    'cheaper than the second. Use a self join on products. Columns: cheaper, pricier, category. ' +
    'Order by category, cheaper, pricier.',
  difficulty: 'hard',
  packs: ['Join Types'],
  dialects: ['generic'],
  datasetId: 'ecommerce',
  challengeType: 'write',
  features: ['join-self'],
  canonical: {
    generic: `
      SELECT a.name AS cheaper, b.name AS pricier, a.category
      FROM products a
      JOIN products b ON a.category = b.category AND a.price < b.price
      ORDER BY a.category, cheaper, pricier
    `,
  },
  grading: { orderMatters: true },
  hints: [
    'Join the products table to itself (two aliases) on matching category.',
    'Keep pairs where a.price < b.price so each unordered pair appears once.',
  ],
};
