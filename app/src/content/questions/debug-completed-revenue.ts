import type { Question } from '../types';

export const debugCompletedRevenue: Question = {
  id: 'q-debug-completed-revenue',
  slug: 'debug-completed-revenue',
  title: 'Debug: revenue per customer',
  prompt:
    'This query is meant to return each customer’s total **completed** order revenue (highest ' +
    'first, ties by name) — but it’s wrong: it counts every order, not just completed ones. ' +
    'Fix it. Columns: name, total.',
  difficulty: 'medium',
  packs: ['Debugging SQL', 'Joins & Aggregations'],
  dialects: ['generic'],
  datasetId: 'ecommerce',
  challengeType: 'debug',
  starterSql: `
    SELECT c.name, SUM(o.amount) AS total
    FROM customers c
    JOIN orders o ON o.customer_id = c.customer_id
    GROUP BY c.name
    ORDER BY total DESC, c.name
  `,
  canonical: {
    generic: `
      SELECT c.name, SUM(o.amount) AS total
      FROM customers c
      JOIN orders o ON o.customer_id = c.customer_id
      WHERE o.status = 'completed'
      GROUP BY c.name
      ORDER BY total DESC, c.name
    `,
  },
  grading: { orderMatters: true },
  hints: ['Which orders should count? Only completed ones.', "Add WHERE o.status = 'completed'."],
};
