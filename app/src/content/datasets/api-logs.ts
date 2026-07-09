import type { Dataset } from '../types';

/**
 * Semi-structured data: each row stores its event as a JSON payload, with the
 * usual messiness — some payloads are missing the `tags` key, currencies vary.
 */
export const apiLogs: Dataset = {
  id: 'api_logs',
  title: 'API logs (JSON)',
  tables: [{ name: 'api_logs', columns: ['id', 'user_id', 'payload'] }],
  setupSql: `
    CREATE OR REPLACE TABLE api_logs (
      id      INTEGER,
      user_id INTEGER,
      payload JSON
    );
    INSERT INTO api_logs VALUES
      (1, 1, '{"action":"purchase","amount":50.00,"currency":"USD","tags":["sale","new"]}'),
      (2, 1, '{"action":"refund","amount":10.00,"currency":"USD","tags":["sale"]}'),
      (3, 2, '{"action":"purchase","amount":99.99,"currency":"GBP","tags":[]}'),
      (4, 3, '{"action":"purchase","amount":20.00,"currency":"USD","tags":["promo"]}'),
      (5, 2, '{"action":"purchase","amount":15.50,"currency":"USD"}');
    -- Bulk: ~1000 JSON payloads. action (i%3) and currency (i%5) are independent.
    -- Deterministic, no random().
    INSERT INTO api_logs
      SELECT 100 + i,
             1 + (i % 50),
             ('{"action":"' || (['purchase','purchase','refund'])[(i % 3) + 1] ||
              '","amount":' || (((i * 7) % 200) + 1)::VARCHAR ||
              '.00,"currency":"' || (['USD','GBP','EUR','USD','GBP'])[(i % 5) + 1] || '"}')::JSON
      FROM generate_series(1, 1000) AS t(i);
  `,
};
