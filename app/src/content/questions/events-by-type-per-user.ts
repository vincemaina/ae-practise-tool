import type { Question } from '../types';

export const eventsByTypePerUser: Question = {
  id: 'q-events-by-type-per-user',
  slug: 'events-by-type-per-user',
  title: 'Event counts by type per user',
  prompt:
    'Pivot the event stream into one row per user with a count column for each event type. ' +
    'Columns: user_id, signups, views, purchases (counts of signup / view_item / purchase ' +
    'events). Order by user_id.',
  difficulty: 'medium',
  packs: ['Joins & Aggregations'],
  dialects: ['generic'],
  datasetId: 'events',
  canonical: {
    generic: `
      SELECT user_id,
             COUNT(*) FILTER (WHERE event_name = 'signup')    AS signups,
             COUNT(*) FILTER (WHERE event_name = 'view_item') AS views,
             COUNT(*) FILTER (WHERE event_name = 'purchase')  AS purchases
      FROM events
      GROUP BY user_id
      ORDER BY user_id
    `,
  },
  grading: { orderMatters: true },
  hints: [
    'Conditional aggregation: COUNT(*) FILTER (WHERE event_name = …) per type.',
    '(Equivalently SUM(CASE WHEN … THEN 1 ELSE 0 END).)',
  ],
};
