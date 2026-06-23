import type { Question } from '../types';

export const eventsPerDay: Question = {
  id: 'q-events-per-day',
  slug: 'events-per-day',
  title: 'Events per day',
  prompt:
    'Count events per calendar day. Columns: day (event_at::DATE) and events. Order by day ' +
    'ascending.',
  difficulty: 'easy',
  packs: ['Core SQL Foundations'],
  dialects: ['generic'],
  datasetId: 'events',
  canonical: {
    generic: `
      SELECT event_at::DATE AS day, COUNT(*) AS events
      FROM events
      GROUP BY day
      ORDER BY day
    `,
  },
  grading: { orderMatters: true },
  hints: ['Cast the timestamp to a date: event_at::DATE.', 'GROUP BY that date and COUNT(*).'],
};
