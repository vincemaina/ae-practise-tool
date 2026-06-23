import type { Question } from '../types';

export const firstEventPerUser: Question = {
  id: 'q-first-event-per-user',
  slug: 'first-event-per-user',
  title: 'First event per user',
  prompt:
    'For each user, return their `user_id` and the timestamp of their earliest event as ' +
    '`first_event_at`. Order by `user_id` ascending.',
  difficulty: 'medium',
  packs: ['Window Functions'],
  dialects: ['generic'],
  datasetId: 'events',
  canonical: {
    generic: `
      SELECT user_id, MIN(event_at) AS first_event_at
      FROM events
      GROUP BY user_id
      ORDER BY user_id
    `,
  },
  grading: { orderMatters: true },
  hints: [
    'One row per user → group by user_id.',
    'The earliest timestamp is MIN(event_at).',
  ],
};
