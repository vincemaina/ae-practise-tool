import type { Question } from '../types';

export const debugDistinctPurchasers: Question = {
  id: 'q-debug-distinct-purchasers',
  slug: 'debug-distinct-purchasers',
  title: 'Debug: distinct purchasers',
  prompt:
    'This query should count how many **distinct** users made a purchase, but the event ' +
    'stream has duplicate rows so it over-counts. Fix it. Single column `purchasers`.',
  difficulty: 'easy',
  packs: ['Debugging SQL', 'Messy Data'],
  dialects: ['generic'],
  datasetId: 'events',
  challengeType: 'debug',
  starterSql: `
    SELECT COUNT(user_id) AS purchasers
    FROM events
    WHERE event_name = 'purchase'
  `,
  canonical: {
    generic: `
      SELECT COUNT(DISTINCT user_id) AS purchasers
      FROM events
      WHERE event_name = 'purchase'
    `,
  },
  grading: {},
  hints: ['COUNT(user_id) counts duplicate rows too.', 'Count distinct users: COUNT(DISTINCT user_id).'],
};
