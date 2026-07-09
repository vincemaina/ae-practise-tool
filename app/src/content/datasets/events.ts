import type { Dataset } from '../types';

/**
 * Product-analytics event stream. Deliberately messy:
 *  - duplicate events (2/9 are identical; 3/10 are an identical purchase) so
 *    dedup and COUNT(DISTINCT) actually matter;
 *  - user 4 purchased WITHOUT ever signing up, so a signup→purchase funnel must
 *    exclude them (a plain "users who purchased" would over-count).
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
      (9, 1, 'view_item', TIMESTAMP '2026-02-01 09:05:00'),
      (10, 1, 'purchase', TIMESTAMP '2026-02-01 09:10:00'),
      (11, 4, 'view_item', TIMESTAMP '2026-02-06 09:00:00'),
      (12, 4, 'purchase', TIMESTAMP '2026-02-06 09:30:00');
    -- Bulk: ~1000 events for users 5+ (specials 1–4 untouched). Deterministic, no random().
    INSERT INTO events
      SELECT 100 + i,
             5 + (i % 46),
             (['signup','view_item','view_item','purchase'])[(i % 4) + 1],
             TIMESTAMP '2026-02-01 00:00:00' + (i % 60) * INTERVAL 1 DAY + (i % 47) * INTERVAL 1 MINUTE
      FROM generate_series(1, 1000) AS t(i);
  `,
};
