import type { Dataset, Difficulty, Question } from './types';
import type { QuestionMetrics } from './metrics';
import { questionMetadata } from './question-metadata.generated';
import { ecommerce } from './datasets/ecommerce';
import { events } from './datasets/events';
import { subscriptions } from './datasets/subscriptions';
import { marketing } from './datasets/marketing';

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

export const datasets: Record<string, Dataset> = {
  [ecommerce.id]: ecommerce,
  [events.id]: events,
  [subscriptions.id]: subscriptions,
  [marketing.id]: marketing,
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
];

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
