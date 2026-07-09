import type { Question } from '../types';

export const fullJoinChannelOverlap: Question = {
  id: 'q-full-join-channel-overlap',
  slug: 'full-join-channel-overlap',
  title: 'Organic vs paid audience overlap',
  prompt:
    'Compare the set of users who had an organic session with those who had a paid session. ' +
    'Using a FULL OUTER JOIN of the two audiences, count users in each segment: "organic ' +
    'only", "paid only", and "both". Columns: segment, users. Order by segment.',
  difficulty: 'hard',
  packs: ['Join Types'],
  dialects: ['generic'],
  datasetId: 'marketing',
  canonical: {
    generic: `
      WITH organic AS (SELECT DISTINCT user_id FROM sessions WHERE channel = 'organic'),
           paid    AS (SELECT DISTINCT user_id FROM sessions WHERE channel = 'paid')
      SELECT CASE
               WHEN o.user_id IS NULL THEN 'paid only'
               WHEN p.user_id IS NULL THEN 'organic only'
               ELSE 'both'
             END AS segment,
             COUNT(*) AS users
      FROM organic o
      FULL OUTER JOIN paid p ON o.user_id = p.user_id
      GROUP BY segment
      ORDER BY segment
    `,
  },
  grading: { orderMatters: true },
  hints: [
    'Build the two audiences as CTEs, then FULL OUTER JOIN on user_id.',
    'A NULL on the organic side means "paid only"; NULL on the paid side means "organic only".',
  ],
};
