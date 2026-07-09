import type { Question } from '../types';

export const pivotStatusByCountry: Question = {
  id: 'q-pivot-status-by-country',
  slug: 'pivot-status-by-country',
  title: 'Pivot order counts by status per country',
  prompt:
    'Produce one row per customer country with a column for each order status — completed, ' +
    'cancelled, refunded — holding the count of orders. Use PIVOT. Columns: country, ' +
    'completed, cancelled, refunded (in that order). Order by country.',
  difficulty: 'hard',
  packs: ['Grouping Sets & Rollups'],
  dialects: ['generic'],
  datasetId: 'ecommerce',
  canonical: {
    generic: `
      PIVOT (
        SELECT c.country, o.status
        FROM customers c
        JOIN orders o ON o.customer_id = c.customer_id
      )
      ON status IN ('completed', 'cancelled', 'refunded')
      USING COUNT(*)
      GROUP BY country
      ORDER BY country
    `,
  },
  grading: { orderMatters: true },
  hints: [
    'DuckDB PIVOT: PIVOT (source) ON status IN (…) USING COUNT(*) GROUP BY country.',
    'List the statuses explicitly in the ON … IN (…) clause to fix the column order.',
  ],
};
