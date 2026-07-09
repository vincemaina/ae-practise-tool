import type { Question } from '../types';

export const debugSpendRank: Question = {
  id: 'q-debug-spend-rank',
  slug: 'debug-spend-rank',
  title: 'Debug: rank customers by spend',
  prompt:
    'This query should rank customers by total completed spend, where customers with **equal** ' +
    'spend share the same rank. It uses the wrong window function (every row gets a distinct ' +
    'number). Fix it. Columns: name, total, spend_rank; ordered by spend_rank then name.',
  difficulty: 'hard',
  packs: ['Debugging SQL', 'Window Functions'],
  dialects: ['generic'],
  datasetId: 'ecommerce',
  challengeType: 'debug',
  starterSql: `
    SELECT c.name,
           SUM(o.amount) AS total,
           ROW_NUMBER() OVER (ORDER BY SUM(o.amount) DESC) AS spend_rank
    FROM customers c
    JOIN orders o ON o.customer_id = c.customer_id
    WHERE o.status = 'completed'
    GROUP BY c.name
    ORDER BY spend_rank, c.name
  `,
  canonical: {
    generic: `
      SELECT c.name,
             SUM(o.amount) AS total,
             RANK() OVER (ORDER BY SUM(o.amount) DESC) AS spend_rank
      FROM customers c
      JOIN orders o ON o.customer_id = c.customer_id
      WHERE o.status = 'completed'
      GROUP BY c.name
      ORDER BY spend_rank, c.name
    `,
  },
  grading: { orderMatters: true },
  hints: [
    'ROW_NUMBER() never ties — two customers with equal spend get different numbers.',
    'RANK() gives tied rows the same rank (and skips the next).',
  ],
};
