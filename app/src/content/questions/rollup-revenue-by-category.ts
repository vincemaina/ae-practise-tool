import type { Question } from '../types';

export const rollupRevenueByCategory: Question = {
  id: 'q-rollup-revenue-by-category',
  slug: 'rollup-revenue-by-category',
  title: 'Category revenue with a grand total (ROLLUP)',
  prompt:
    'For completed orders, compute item revenue (quantity × price) per product category, plus ' +
    'a grand-total row using GROUP BY ROLLUP. The grand total has category = NULL. Columns: ' +
    'category, revenue. Order with the grand total last, otherwise by revenue descending.',
  difficulty: 'hard',
  packs: ['Grouping Sets & Rollups'],
  dialects: ['generic'],
  datasetId: 'ecommerce',
  canonical: {
    generic: `
      SELECT p.category, SUM(oi.quantity * p.price) AS revenue
      FROM order_items oi
      JOIN orders o ON o.order_id = oi.order_id
      JOIN products p ON p.product_id = oi.product_id
      WHERE o.status = 'completed'
      GROUP BY ROLLUP (p.category)
      ORDER BY (p.category IS NULL), revenue DESC, p.category
    `,
  },
  grading: { orderMatters: true },
  hints: [
    'GROUP BY ROLLUP (category) adds an extra row where category is NULL — the grand total.',
    'Sort the NULL (total) row last with ORDER BY (category IS NULL), then revenue DESC.',
  ],
};
