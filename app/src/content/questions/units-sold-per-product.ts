import type { Question } from '../types';

export const unitsSoldPerProduct: Question = {
  id: 'q-units-sold-per-product',
  slug: 'units-sold-per-product',
  title: 'Units sold per product',
  prompt:
    'For each product sold in a completed order, return the product name and total units ' +
    'sold (sum of quantity), most first (ties by name). Only count items from completed ' +
    'orders. Columns: name, units.',
  difficulty: 'medium',
  packs: ['Joins & Aggregations'],
  dialects: ['generic'],
  datasetId: 'ecommerce',
  canonical: {
    generic: `
      SELECT p.name, SUM(oi.quantity) AS units
      FROM order_items oi
      JOIN orders o ON o.order_id = oi.order_id
      JOIN products p ON p.product_id = oi.product_id
      WHERE o.status = 'completed'
      GROUP BY p.name
      ORDER BY units DESC, p.name
    `,
  },
  grading: { orderMatters: true },
  hints: [
    'Join order_items → orders (to filter status) → products (for the name).',
    'SUM(quantity) grouped by product.',
  ],
};
