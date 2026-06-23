import type { Question } from '../types';

export const customerCompletedRevenue: Question = {
  id: 'q-customer-completed-revenue',
  slug: 'customer-completed-revenue',
  title: 'Revenue per customer (completed orders)',
  prompt:
    'For each customer who has at least one completed order, return their name and the ' +
    'total amount of their completed orders, ordered from highest total to lowest. ' +
    "Only count orders with status 'completed'.",
  difficulty: 'easy',
  packs: ['Joins & Aggregations'],
  dialects: ['generic'],
  datasetId: 'ecommerce',
  canonical: {
    generic: `
      SELECT c.name, SUM(o.amount) AS total
      FROM customers c
      JOIN orders o ON o.customer_id = c.customer_id
      WHERE o.status = 'completed'
      GROUP BY c.name
      ORDER BY total DESC
    `,
  },
  grading: {
    orderMatters: true,
  },
};
