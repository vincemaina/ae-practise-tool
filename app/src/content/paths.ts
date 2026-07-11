/** Curated, ordered learning tracks built from existing questions (easy → hard). */
export interface LearningPath {
  id: string;
  title: string;
  description: string;
  questionIds: string[];
}

export const paths: LearningPath[] = [
  {
    id: 'foundations',
    title: 'SQL Foundations',
    description: 'Filtering, sorting, grouping and basic aggregation to warm up.',
    questionIds: [
      'q-orders-by-status',
      'q-products-in-category',
      'q-completed-avg-order-value',
      'q-distinct-purchasers',
      'q-events-per-day',
      'q-active-subscriptions',
      'q-churned-customers',
    ],
  },
  {
    id: 'joins-agg',
    title: 'Joins & Aggregation',
    description: 'Combine tables and aggregate — the bread and butter of analytics SQL.',
    questionIds: [
      'q-customer-completed-revenue',
      'q-units-sold-per-product',
      'q-revenue-by-category',
      'q-mrr-by-plan',
      'q-repeat-customers',
      'q-net-revenue-per-customer',
      'q-events-by-type-per-user',
    ],
  },
  {
    id: 'window',
    title: 'Window Functions',
    description: 'Ranking, running totals, gaps and sessionisation with OVER().',
    questionIds: [
      'q-first-event-per-user',
      'q-customer-spend-rank',
      'q-running-revenue-by-day',
      'q-top-completed-order-per-customer',
      'q-time-between-events',
      'q-signup-mom-growth',
      'q-sessions-per-user',
    ],
  },
  {
    id: 'ctes-subqueries',
    title: 'CTEs & Subqueries',
    description: 'Break multi-step problems into clear stages.',
    questionIds: [
      'q-second-highest-order',
      'q-customers-without-completed-orders',
      'q-avg-items-per-order',
      'q-time-to-first-purchase',
    ],
  },
  {
    id: 'messy-data',
    title: 'Messy data',
    description:
      "Real tables are dirty — inconsistent case, stray whitespace, duplicates. The prompt won't tell you how it's messy; clean as you go.",
    questionIds: [
      'q-messy-distinct-customers',
      'q-messy-completed-orders',
      'q-messy-not-cancelled',
      'q-messy-distinct-countries',
      'q-distinct-events-dedup',
    ],
  },
  {
    id: 'ae-interview',
    title: 'AE interview sprint',
    description: 'A hard, mixed set — funnels, cohorts, attribution, sessionisation — like a real analytics-engineering loop.',
    questionIds: [
      'q-funnel-signup-to-purchase',
      'q-signups-by-month-cohort',
      'q-first-touch-attribution',
      'q-conversion-rate-by-channel',
      'q-sessions-per-user',
      'q-time-to-first-purchase',
      'q-json-purchase-total-by-currency',
    ],
  },
];
