import type { Question } from '../types';

export const orgHeadcountByLevel: Question = {
  id: 'q-org-headcount-by-level',
  slug: 'org-headcount-by-level',
  title: 'Headcount by org level (recursive CTE)',
  prompt:
    'The employees table is a hierarchy: each row’s manager_id points at another employee ' +
    '(the CEO has manager_id = NULL). Using a recursive CTE, assign each employee a level ' +
    '(CEO = 1, their reports = 2, and so on), then return the number of employees at each ' +
    'level. Columns: level, employees. Order by level.',
  difficulty: 'hard',
  packs: ['Recursive Queries', 'CTEs & Subqueries'],
  dialects: ['generic'],
  datasetId: 'org',
  canonical: {
    generic: `
      WITH RECURSIVE chain AS (
        SELECT employee_id, 1 AS level
        FROM employees
        WHERE manager_id IS NULL
        UNION ALL
        SELECT e.employee_id, c.level + 1
        FROM employees e
        JOIN chain c ON e.manager_id = c.employee_id
      )
      SELECT level, COUNT(*) AS employees
      FROM chain
      GROUP BY level
      ORDER BY level
    `,
  },
  grading: { orderMatters: true },
  hints: [
    'The recursive CTE’s anchor is the CEO (manager_id IS NULL) at level 1.',
    'The recursive step joins employees to the chain on manager_id = employee_id, adding 1 to level.',
  ],
};
