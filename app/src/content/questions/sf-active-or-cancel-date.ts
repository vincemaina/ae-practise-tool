import type { Question } from '../types';

export const sfActiveOrCancelDate: Question = {
  id: 'q-sf-active-or-cancel-date',
  slug: 'sf-active-or-cancel-date',
  title: 'Cancel date or "active" (Snowflake NVL + TO_VARCHAR)',
  prompt:
    "You're writing Snowflake SQL. For each subscription, return the customer and its cancel " +
    "date as text — or the word 'active' when it hasn't been cancelled. Use Snowflake's NVL and " +
    'TO_VARCHAR. Columns: customer, cancel_status. Order by customer, cancel_status.',
  difficulty: 'easy',
  packs: ['Snowflake'],
  dialects: ['snowflake'],
  datasetId: 'subscriptions',
  canonical: {
    generic: `
      SELECT customer,
             COALESCE(CAST(canceled_at AS VARCHAR), 'active') AS cancel_status
      FROM subscriptions
      ORDER BY customer, cancel_status
    `,
    snowflake: `
      SELECT customer,
             NVL(TO_VARCHAR(canceled_at), 'active') AS cancel_status
      FROM subscriptions
      ORDER BY customer, cancel_status
    `,
  },
  grading: { orderMatters: true },
  hints: [
    'TO_VARCHAR(canceled_at) turns the date into text; it is NULL when there is no cancel date.',
    "NVL(value, 'active') substitutes 'active' whenever value is NULL.",
  ],
};
