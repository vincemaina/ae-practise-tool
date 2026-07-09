import type { Question } from '../types';

export const ntileSpendQuartiles: Question = {
  id: 'q-ntile-spend-quartiles',
  slug: 'ntile-spend-quartiles',
  title: 'Customer spend quartiles (NTILE)',
  prompt:
    'For customers with completed orders, split them into 4 quartiles by total completed spend ' +
    'using NTILE(4), where quartile 1 is the highest spenders. Columns: name, total, quartile. ' +
    'Order by quartile, then total descending, then name.',
  difficulty: 'hard',
  packs: ['Window Functions'],
  dialects: ['generic'],
  datasetId: 'ecommerce',
  canonical: {
    generic: `
      SELECT c.name,
             SUM(o.amount) AS total,
             NTILE(4) OVER (ORDER BY SUM(o.amount) DESC, c.name) AS quartile
      FROM customers c
      JOIN orders o ON o.customer_id = c.customer_id
      WHERE o.status = 'completed'
      GROUP BY c.customer_id, c.name
      ORDER BY quartile, total DESC, c.name
    `,
  },
  grading: { orderMatters: true },
  hints: [
    'NTILE(4) OVER (ORDER BY total DESC) assigns each row to one of 4 buckets.',
    'Add a tie-break (…, name) to the window ORDER BY so the buckets are deterministic.',
  ],
};
