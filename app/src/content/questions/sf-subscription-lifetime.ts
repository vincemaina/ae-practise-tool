import type { Question } from '../types';

export const sfSubscriptionLifetime: Question = {
  id: 'q-sf-subscription-lifetime',
  slug: 'sf-subscription-lifetime',
  title: 'How long each subscription lasted (Snowflake DATEDIFF)',
  prompt:
    "You're writing Snowflake SQL. For cancelled subscriptions only, how many days did each " +
    "last? Use Snowflake's DATEDIFF between started_at and canceled_at. Columns: customer, days. " +
    'Order by days descending, then customer.',
  difficulty: 'medium',
  packs: ['Snowflake', 'Dates & Time'],
  dialects: ['snowflake'],
  datasetId: 'subscriptions',
  canonical: {
    generic: `
      SELECT customer, (canceled_at - started_at) AS days
      FROM subscriptions
      WHERE canceled_at IS NOT NULL
      ORDER BY days DESC, customer
    `,
    snowflake: `
      SELECT customer, DATEDIFF('day', started_at, canceled_at) AS days
      FROM subscriptions
      WHERE canceled_at IS NOT NULL
      ORDER BY days DESC, customer
    `,
  },
  grading: { orderMatters: true },
  hints: [
    'Only cancelled rows count: WHERE canceled_at IS NOT NULL.',
    "DATEDIFF('day', started_at, canceled_at) returns the number of whole days between them.",
  ],
};
