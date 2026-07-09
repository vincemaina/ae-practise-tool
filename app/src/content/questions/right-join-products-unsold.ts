import type { Question } from '../types';

export const rightJoinProductsUnsold: Question = {
  id: 'q-right-join-products-unsold',
  slug: 'right-join-products-unsold',
  title: 'Units sold per product (including never sold)',
  prompt:
    'List every product and the total units sold across all order items — including products ' +
    'that have never been ordered (show 0). Start from order_items and RIGHT JOIN to products. ' +
    'Columns: name, units. Order by units ascending, then name.',
  difficulty: 'medium',
  packs: ['Join Types'],
  dialects: ['generic'],
  datasetId: 'ecommerce',
  canonical: {
    generic: `
      SELECT p.name, COALESCE(SUM(oi.quantity), 0) AS units
      FROM order_items oi
      RIGHT JOIN products p ON p.product_id = oi.product_id
      GROUP BY p.product_id, p.name
      ORDER BY units, p.name
    `,
  },
  grading: { orderMatters: true },
  hints: [
    'RIGHT JOIN keeps every product even when no order_items match.',
    'Unmatched products get NULL for quantity — wrap the SUM in COALESCE(…, 0).',
  ],
};
