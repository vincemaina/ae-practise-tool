import type { Question } from '../types';

export const rollupCategoryTotalLabel: Question = {
  id: 'q-rollup-category-total-label',
  slug: 'rollup-category-total-label',
  title: 'Label the ROLLUP grand total with GROUPING()',
  prompt:
    'Compute completed-order item revenue (quantity × price) per category with a ROLLUP grand ' +
    'total, but instead of a NULL total row, label it "All categories" using the GROUPING() ' +
    'function. Columns: scope, revenue. Put the total row last, otherwise order by revenue ' +
    'descending.',
  difficulty: 'hard',
  packs: ['Grouping Sets & Rollups'],
  dialects: ['generic'],
  datasetId: 'ecommerce',
  canonical: {
    generic: `
      SELECT CASE WHEN GROUPING(p.category) = 1 THEN 'All categories' ELSE p.category END AS scope,
             SUM(oi.quantity * p.price) AS revenue
      FROM order_items oi
      JOIN orders o ON o.order_id = oi.order_id
      JOIN products p ON p.product_id = oi.product_id
      WHERE o.status = 'completed'
      GROUP BY ROLLUP (p.category)
      ORDER BY GROUPING(p.category), revenue DESC, scope
    `,
  },
  grading: { orderMatters: true },
  hints: [
    'GROUPING(category) returns 1 on the ROLLUP total row (where category is NULL), else 0.',
    'Use it in a CASE for the label and in ORDER BY to push the total row last.',
  ],
};
