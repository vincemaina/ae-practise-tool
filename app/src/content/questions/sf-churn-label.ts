import type { Question } from '../types';

export const sfChurnLabel: Question = {
  id: 'q-sf-churn-label',
  slug: 'sf-churn-label',
  title: 'Label churned vs active (Snowflake NVL2)',
  prompt:
    "You're writing Snowflake SQL. Using Snowflake's NVL2, label each subscription 'churned' " +
    "when it has a cancel date and 'active' when it doesn't. Columns: customer, status. Order " +
    'by customer, status.',
  difficulty: 'easy',
  packs: ['Snowflake'],
  dialects: ['snowflake'],
  datasetId: 'subscriptions',
  canonical: {
    generic: `
      SELECT customer,
             CASE WHEN canceled_at IS NOT NULL THEN 'churned' ELSE 'active' END AS status
      FROM subscriptions
      ORDER BY customer, status
    `,
    snowflake: `
      SELECT customer,
             NVL2(canceled_at, 'churned', 'active') AS status
      FROM subscriptions
      ORDER BY customer, status
    `,
  },
  grading: { orderMatters: true },
  requires: { pattern: /\bnvl2\s*\(/i, message: "Use Snowflake's NVL2, not a CASE expression." },
  hints: [
    'NVL2(expr, a, b) returns a when expr is NOT NULL, and b when it IS NULL.',
    "So NVL2(canceled_at, 'churned', 'active') keys off whether a cancel date exists.",
  ],
};
