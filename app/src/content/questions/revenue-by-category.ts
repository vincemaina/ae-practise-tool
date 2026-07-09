import type { Question } from '../types';

export const revenueByCategory: Question = {
  id: 'q-revenue-by-category',
  slug: 'revenue-by-category',
  title: 'Revenue by product category',
  prompt:
    'Item revenue is quantity × price. For completed orders only, return each product ' +
    'category and its total item revenue, highest first. Columns: category, revenue.',
  difficulty: 'medium',
  packs: ['Joins & Aggregations'],
  dialects: ['generic'],
  datasetId: 'ecommerce',
  canonical: {
    generic: `
      SELECT p.category, SUM(oi.quantity * p.price) AS revenue
      FROM order_items oi
      JOIN orders o ON o.order_id = oi.order_id
      JOIN products p ON p.product_id = oi.product_id
      WHERE o.status = 'completed'
      GROUP BY p.category
      ORDER BY revenue DESC, p.category
    `,
  },
  grading: { orderMatters: true },
  hints: ['Revenue per line = quantity * price.', 'Group by category after filtering to completed orders.'],
};
