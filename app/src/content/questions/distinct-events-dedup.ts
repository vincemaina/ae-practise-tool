import type { Question } from '../types';

export const distinctEventsDedup: Question = {
  id: 'q-distinct-events-dedup',
  slug: 'distinct-events-dedup',
  title: 'De-duplicate the event stream',
  prompt:
    'The event stream contains exact duplicate rows. Return the number of unique events, ' +
    'where uniqueness is defined by (user_id, event_name, event_at). Single column ' +
    'unique_events.',
  difficulty: 'medium',
  packs: ['Messy Data'],
  dialects: ['generic'],
  datasetId: 'events',
  canonical: {
    generic: `
      SELECT COUNT(*) AS unique_events
      FROM (
        SELECT DISTINCT user_id, event_name, event_at FROM events
      )
    `,
  },
  grading: {},
  hints: [
    'COUNT(*) counts duplicate rows too — you need distinct combinations.',
    'Count rows from SELECT DISTINCT user_id, event_name, event_at.',
  ],
};
