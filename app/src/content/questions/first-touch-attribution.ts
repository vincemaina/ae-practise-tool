import type { Question } from '../types';

export const firstTouchAttribution: Question = {
  id: 'q-first-touch-attribution',
  slug: 'first-touch-attribution',
  title: 'First-touch attribution',
  prompt:
    'For every user who converted (has at least one converted session), find their ' +
    'first-touch channel — the channel of their earliest session. Then count converters by ' +
    'that first-touch channel. Columns: channel, converters. Order by converters desc, then channel.',
  difficulty: 'hard',
  packs: ['Attribution'],
  dialects: ['snowflake', 'bigquery'],
  datasetId: 'marketing',
  canonical: {
    generic: `
      WITH converters AS (
        SELECT DISTINCT user_id FROM sessions WHERE converted
      ),
      first_touch AS (
        SELECT user_id, channel
        FROM sessions
        WHERE user_id IN (SELECT user_id FROM converters)
        QUALIFY ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY started_at, session_id) = 1
      )
      SELECT channel, COUNT(*) AS converters
      FROM first_touch
      GROUP BY channel
      ORDER BY converters DESC, channel
    `,
  },
  grading: { orderMatters: true },
  hints: [
    'Find converting users, then their earliest session per user (ROW_NUMBER + QUALIFY).',
    'Count those first-touch channels.',
  ],
};
