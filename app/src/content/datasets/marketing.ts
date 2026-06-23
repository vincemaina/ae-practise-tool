import type { Dataset } from '../types';

/**
 * Marketing sessions for attribution / conversion-rate questions.
 * A user may have several sessions across channels; `converted` marks the
 * session in which they converted.
 */
export const marketing: Dataset = {
  id: 'marketing',
  title: 'Marketing sessions',
  tables: [
    {
      name: 'sessions',
      columns: ['session_id', 'user_id', 'channel', 'started_at', 'converted'],
    },
  ],
  setupSql: `
    CREATE OR REPLACE TABLE sessions (
      session_id INTEGER,
      user_id    INTEGER,
      channel    VARCHAR,
      started_at TIMESTAMP,
      converted  BOOLEAN
    );
    INSERT INTO sessions VALUES
      (1, 1, 'organic', TIMESTAMP '2026-03-01 10:00:00', false),
      (2, 1, 'email',   TIMESTAMP '2026-03-02 12:00:00', false),
      (3, 1, 'paid',    TIMESTAMP '2026-03-03 11:00:00', true),
      (4, 2, 'organic', TIMESTAMP '2026-03-02 09:00:00', false),
      (5, 2, 'email',   TIMESTAMP '2026-03-05 09:00:00', false),
      (6, 3, 'paid',    TIMESTAMP '2026-03-04 14:00:00', true),
      (7, 4, 'organic', TIMESTAMP '2026-03-06 08:00:00', false),
      (8, 3, 'organic', TIMESTAMP '2026-03-01 07:00:00', false);
  `,
};
