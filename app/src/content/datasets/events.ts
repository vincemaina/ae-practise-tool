import type { Dataset } from '../types';

/**
 * Product-analytics event stream. Includes a duplicate event (event_id 2 / 9)
 * so dedup-style questions have something realistic to handle.
 */
export const events: Dataset = {
  id: 'events',
  title: 'Product events',
  tables: [{ name: 'events', columns: ['event_id', 'user_id', 'event_name', 'event_at'] }],
  setupSql: `
    CREATE OR REPLACE TABLE events (
      event_id   INTEGER,
      user_id    INTEGER,
      event_name VARCHAR,
      event_at   TIMESTAMP
    );
    INSERT INTO events VALUES
      (1, 1, 'signup',    TIMESTAMP '2026-02-01 09:00:00'),
      (2, 1, 'view_item', TIMESTAMP '2026-02-01 09:05:00'),
      (3, 1, 'purchase',  TIMESTAMP '2026-02-01 09:10:00'),
      (4, 2, 'signup',    TIMESTAMP '2026-02-02 10:00:00'),
      (5, 2, 'view_item', TIMESTAMP '2026-02-02 10:02:00'),
      (6, 3, 'signup',    TIMESTAMP '2026-02-03 11:00:00'),
      (7, 1, 'view_item', TIMESTAMP '2026-02-04 08:00:00'),
      (8, 2, 'purchase',  TIMESTAMP '2026-02-05 12:00:00'),
      (9, 1, 'view_item', TIMESTAMP '2026-02-01 09:05:00');
  `,
};
