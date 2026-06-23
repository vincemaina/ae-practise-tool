import type { Dataset } from '../types';

/**
 * SaaS subscription data for MRR / churn / cohort questions.
 * `canceled_at IS NULL` means the subscription is still active.
 */
export const subscriptions: Dataset = {
  id: 'subscriptions',
  title: 'SaaS subscriptions',
  tables: [
    {
      name: 'subscriptions',
      columns: ['sub_id', 'customer', 'plan', 'mrr', 'started_at', 'canceled_at'],
    },
  ],
  setupSql: `
    CREATE OR REPLACE TABLE subscriptions (
      sub_id      INTEGER,
      customer    VARCHAR,
      plan        VARCHAR,
      mrr         DECIMAL(10,2),
      started_at  DATE,
      canceled_at DATE
    );
    INSERT INTO subscriptions VALUES
      (1, 'Acme',     'Pro',        99.00,  DATE '2025-11-05', NULL),
      (2, 'Globex',   'Basic',      29.00,  DATE '2025-12-01', DATE '2026-02-15'),
      (3, 'Initech',  'Pro',        99.00,  DATE '2026-01-10', NULL),
      (4, 'Umbrella', 'Enterprise', 499.00, DATE '2026-01-20', NULL),
      (5, 'Hooli',    'Basic',      29.00,  DATE '2025-10-01', DATE '2026-01-05'),
      (6, 'Stark',    'Pro',        99.00,  DATE '2026-02-02', DATE '2026-03-01');
  `,
};
