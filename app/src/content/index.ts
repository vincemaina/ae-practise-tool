import type { Dataset, Difficulty, Question } from './types';
import type { QuestionMetrics } from './metrics';
import { conceptsOf, CONCEPT_ORDER } from './metrics';
import { questionMetadata } from './question-metadata.generated';
export { paths, type LearningPath } from './paths';
export { DIALECT_OPTIONS, matchesDialect, type DialectFilter } from './dialects';
import { ecommerce } from './datasets/ecommerce';
import { events } from './datasets/events';
import { subscriptions } from './datasets/subscriptions';
import { marketing } from './datasets/marketing';
import { apiLogs } from './datasets/api-logs';
import { org } from './datasets/org';

// Easy
import { ordersByStatus } from './questions/orders-by-status';
import { completedAvgOrderValue } from './questions/completed-avg-order-value';
import { productsInCategory } from './questions/products-in-category';
import { distinctPurchasers } from './questions/distinct-purchasers';
import { eventsPerDay } from './questions/events-per-day';
import { activeSubscriptions } from './questions/active-subscriptions';
import { churnedCustomers } from './questions/churned-customers';
import { arpuActive } from './questions/arpu-active';
import { sessionsPerChannel } from './questions/sessions-per-channel';
import { customerCompletedRevenue } from './questions/customer-completed-revenue';
// Medium
import { unitsSoldPerProduct } from './questions/units-sold-per-product';
import { revenueByCategory } from './questions/revenue-by-category';
import { mrrByPlan } from './questions/mrr-by-plan';
import { avgItemsPerOrder } from './questions/avg-items-per-order';
import { secondHighestOrder } from './questions/second-highest-order';
import { customersWithoutCompletedOrders } from './questions/customers-without-completed-orders';
import { distinctEventsDedup } from './questions/distinct-events-dedup';
import { firstEventPerUser } from './questions/first-event-per-user';
// Hard
import { customerSpendRank } from './questions/customer-spend-rank';
import { runningRevenueByDay } from './questions/running-revenue-by-day';
import { timeBetweenEvents } from './questions/time-between-events';
import { topCompletedOrderPerCustomer } from './questions/top-completed-order-per-customer';
import { funnelSignupToPurchase } from './questions/funnel-signup-to-purchase';
import { signupsByMonthCohort } from './questions/signups-by-month-cohort';
import { firstTouchAttribution } from './questions/first-touch-attribution';
import { conversionRateByChannel } from './questions/conversion-rate-by-channel';
// Harder / multi-step batch
import { repeatCustomers } from './questions/repeat-customers';
import { netRevenuePerCustomer } from './questions/net-revenue-per-customer';
import { eventsByTypePerUser } from './questions/events-by-type-per-user';
import { sessionsPerUser } from './questions/sessions-per-user';
import { signupMomGrowth } from './questions/signup-mom-growth';
import { timeToFirstPurchase } from './questions/time-to-first-purchase';
import { jsonPurchaseTotalByCurrency } from './questions/json-purchase-total-by-currency';
// Debugging challenges (fix a broken query)
import { debugCompletedRevenue } from './questions/debug-completed-revenue';
import { debugDistinctPurchasers } from './questions/debug-distinct-purchasers';
import { debugCustomersWithoutCompleted } from './questions/debug-customers-without-completed';
import { debugSpendRank } from './questions/debug-spend-rank';
// Advanced: join types
import { leftJoinOrderCounts } from './questions/left-join-order-counts';
import { rightJoinProductsUnsold } from './questions/right-join-products-unsold';
import { fullJoinChannelOverlap } from './questions/full-join-channel-overlap';
import { crossJoinCountryStatusGrid } from './questions/cross-join-country-status-grid';
import { selfJoinProductPairs } from './questions/self-join-product-pairs';
import { semiJoinExistsCompleted } from './questions/semi-join-exists-completed';
// Advanced: grouping sets / rollup / cube / pivot
import { rollupRevenueByCategory } from './questions/rollup-revenue-by-category';
import { cubeOrdersCountryStatus } from './questions/cube-orders-country-status';
import { groupingSetsCountryStatus } from './questions/grouping-sets-country-status';
import { pivotStatusByCountry } from './questions/pivot-status-by-country';
// Advanced: set operations
import { exceptNoCompleted } from './questions/except-no-completed';
import { intersectCompletedAndRefunded } from './questions/intersect-completed-and-refunded';
import { unionMerchOrPremium } from './questions/union-merch-or-premium';
// Advanced: window functions
import { ntileSpendQuartiles } from './questions/ntile-spend-quartiles';
import { firstLastOrderAmount } from './questions/first-last-order-amount';
import { movingAvgRevenue } from './questions/moving-avg-revenue';
// Advanced: strings
import { likeNamedCustomers } from './questions/like-named-customers';
// General-SQL quick wins (ANSI, cross-dialect)
import { orgHeadcountByLevel } from './questions/org-headcount-by-level';
import { rollupCategoryTotalLabel } from './questions/rollup-category-total-label';
import { completedOrdersByMonth } from './questions/completed-orders-by-month';
import { customerNameFormat } from './questions/customer-name-format';
// Snowflake showcase (written in Snowflake, transpiled to run — ADR 0006)
import { sfProductTier } from './questions/sf-product-tier';
import { sfCustomerNumber } from './questions/sf-customer-number';
import { sfTopProducts } from './questions/sf-top-products';
import { sfActiveOrCancelDate } from './questions/sf-active-or-cancel-date';
import { sfSubscriptionLifetime } from './questions/sf-subscription-lifetime';
import { sfRenewalDate } from './questions/sf-renewal-date';
import { sfProductsPerCategory } from './questions/sf-products-per-category';
import { sfLargestOrderPerCustomer } from './questions/sf-largest-order-per-customer';
import { sfMedianOrderAmount } from './questions/sf-median-order-amount';
import { sfJsonAmountPerUser } from './questions/sf-json-amount-per-user';
import { sfGenericCustomers } from './questions/sf-generic-customers';
import { sfChurnLabel } from './questions/sf-churn-label';

export const datasets: Record<string, Dataset> = {
  [ecommerce.id]: ecommerce,
  [events.id]: events,
  [subscriptions.id]: subscriptions,
  [marketing.id]: marketing,
  [apiLogs.id]: apiLogs,
  [org.id]: org,
};

// Ordered easy → hard so the default list reads as a learning path.
export const questions: Question[] = [
  ordersByStatus,
  completedAvgOrderValue,
  productsInCategory,
  distinctPurchasers,
  eventsPerDay,
  activeSubscriptions,
  churnedCustomers,
  arpuActive,
  sessionsPerChannel,
  customerCompletedRevenue,
  unitsSoldPerProduct,
  revenueByCategory,
  mrrByPlan,
  avgItemsPerOrder,
  secondHighestOrder,
  customersWithoutCompletedOrders,
  distinctEventsDedup,
  firstEventPerUser,
  customerSpendRank,
  runningRevenueByDay,
  timeBetweenEvents,
  topCompletedOrderPerCustomer,
  funnelSignupToPurchase,
  signupsByMonthCohort,
  firstTouchAttribution,
  conversionRateByChannel,
  // Harder / multi-step
  repeatCustomers,
  netRevenuePerCustomer,
  eventsByTypePerUser,
  signupMomGrowth,
  sessionsPerUser,
  timeToFirstPurchase,
  jsonPurchaseTotalByCurrency,
  // Debugging challenges
  debugCompletedRevenue,
  debugDistinctPurchasers,
  debugCustomersWithoutCompleted,
  debugSpendRank,
  // Advanced: join types
  leftJoinOrderCounts,
  rightJoinProductsUnsold,
  fullJoinChannelOverlap,
  crossJoinCountryStatusGrid,
  selfJoinProductPairs,
  semiJoinExistsCompleted,
  // Advanced: grouping sets / rollup / cube / pivot
  rollupRevenueByCategory,
  cubeOrdersCountryStatus,
  groupingSetsCountryStatus,
  pivotStatusByCountry,
  // Advanced: set operations
  exceptNoCompleted,
  intersectCompletedAndRefunded,
  unionMerchOrPremium,
  // Advanced: window functions
  ntileSpendQuartiles,
  firstLastOrderAmount,
  movingAvgRevenue,
  // Advanced: strings
  likeNamedCustomers,
  // General-SQL quick wins
  orgHeadcountByLevel,
  rollupCategoryTotalLabel,
  completedOrdersByMonth,
  customerNameFormat,
  // Snowflake showcase
  sfProductTier,
  sfCustomerNumber,
  sfTopProducts,
  sfActiveOrCancelDate,
  sfChurnLabel,
  sfRenewalDate,
  sfMedianOrderAmount,
  sfGenericCustomers,
  sfSubscriptionLifetime,
  sfProductsPerCategory,
  sfLargestOrderPerCustomer,
  sfJsonAmountPerUser,
];

const DIFF_RANK: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

/**
 * The next question to recommend: finish "needs review" first (easiest first),
 * otherwise target the user's least-practiced concept at the easiest unsolved
 * level. Returns null when everything is solved.
 */
export function recommendNext(
  solvedIds: string[],
  reviewIds: string[],
  pool: Question[] = questions,
): string | null {
  const solved = new Set(solvedIds);
  const inPool = new Set(pool.map((q) => q.id));

  const review = reviewIds
    .filter((id) => !solved.has(id) && inPool.has(id))
    .map((id) => pool.find((q) => q.id === id))
    .filter((q): q is Question => Boolean(q))
    .sort((a, b) => DIFF_RANK[a.difficulty] - DIFF_RANK[b.difficulty]);
  if (review[0]) return review[0].id;

  const unsolved = pool.filter((q) => !solved.has(q.id));
  if (unsolved.length === 0) return null;

  const conceptSolved: Record<string, number> = {};
  for (const id of solvedIds) {
    for (const c of questionConcepts(id)) conceptSolved[c] = (conceptSolved[c] ?? 0) + 1;
  }
  const weakness = (q: Question) => {
    const cs = questionConcepts(q.id);
    // No concepts (basic questions) → treat as "not weak" so they sort last,
    // rather than tying at 0 and perpetually leading the recommendation.
    return cs.length ? Math.min(...cs.map((c) => conceptSolved[c] ?? 0)) : Infinity;
  };
  const sorted = [...unsolved].sort(
    (a, b) => weakness(a) - weakness(b) || DIFF_RANK[a.difficulty] - DIFF_RANK[b.difficulty],
  );
  return sorted[0]?.id ?? null;
}

export const firstQuestion: Question = questions[0]!;

export const allPacks: string[] = [...new Set(questions.flatMap((q) => q.packs))].sort();

export const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];

export function getDataset(id: string): Dataset {
  const dataset = datasets[id];
  if (!dataset) throw new Error(`Unknown dataset: ${id}`);
  return dataset;
}

export function getQuestion(id: string): Question | undefined {
  return questions.find((q) => q.id === id);
}

/** Structural metrics derived from the canonical solution (see metrics.ts). */
export function getMetrics(id: string): QuestionMetrics | undefined {
  return questionMetadata[id];
}

/** Structural concepts a question exercises (for concept filtering). */
export function questionConcepts(id: string): string[] {
  const m = questionMetadata[id];
  return m ? conceptsOf(m) : [];
}

/** All concepts present across the bank, in canonical order. */
export const allConcepts: string[] = CONCEPT_ORDER.filter((concept) =>
  questions.some((q) => questionConcepts(q.id).includes(concept)),
);
