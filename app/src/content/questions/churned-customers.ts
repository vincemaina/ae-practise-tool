import type { Question } from '../types';

export const churnedCustomers: Question = {
  id: 'q-churned-customers',
  slug: 'churned-customers',
  title: 'Churned customers',
  prompt:
    'List the customers who have cancelled their subscription (canceled_at IS NOT NULL), ' +
    'alphabetically. Single column customer.',
  difficulty: 'easy',
  packs: ['Core SQL Foundations'],
  dialects: ['generic'],
  datasetId: 'subscriptions',
  canonical: {
    generic: `
      SELECT customer
      FROM subscriptions
      WHERE canceled_at IS NOT NULL
      ORDER BY customer
    `,
  },
  grading: { orderMatters: true },
  hints: ['Cancelled means canceled_at IS NOT NULL.', 'ORDER BY customer for alphabetical order.'],
};
