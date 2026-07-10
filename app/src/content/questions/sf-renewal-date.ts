import type { Question } from '../types';

export const sfRenewalDate: Question = {
  id: 'q-sf-renewal-date',
  slug: 'sf-renewal-date',
  title: 'Renewal date 30 days out (Snowflake DATEADD)',
  prompt:
    "You're writing Snowflake SQL. Each subscription renews 30 days after it started. Using " +
    "Snowflake's DATEADD, return the customer and the renewal date. Columns: customer, " +
    'renews_on. Order by renews_on, then customer.',
  difficulty: 'easy',
  packs: ['Snowflake', 'Dates & Time'],
  dialects: ['snowflake'],
  datasetId: 'subscriptions',
  canonical: {
    generic: `
      SELECT customer, started_at + INTERVAL 30 DAY AS renews_on
      FROM subscriptions
      ORDER BY renews_on, customer
    `,
    snowflake: `
      SELECT customer, DATEADD('day', 30, started_at) AS renews_on
      FROM subscriptions
      ORDER BY renews_on, customer
    `,
  },
  grading: { orderMatters: true },
  hints: [
    "DATEADD('day', 30, started_at) shifts the start date forward by 30 days.",
    'Order by the computed renews_on, breaking ties by customer.',
  ],
};
