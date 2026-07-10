import type { Dataset } from '../types';

/**
 * Org hierarchy — a self-referencing employees table (manager_id → employee_id)
 * for recursive-CTE and hierarchy questions. Deterministically generated as a
 * 3-ary tree rooted at employee 1 (the CEO, manager_id NULL); ~121 employees,
 * ~5 levels deep. No random().
 */
export const org: Dataset = {
  id: 'org',
  title: 'Org hierarchy',
  tables: [
    { name: 'employees', columns: ['employee_id', 'name', 'manager_id', 'department', 'salary'] },
  ],
  setupSql: `
    CREATE OR REPLACE TABLE employees (
      employee_id INTEGER,
      name        VARCHAR,
      manager_id  INTEGER,
      department  VARCHAR,
      salary      INTEGER
    );
    INSERT INTO employees
      SELECT i,
             'Employee ' || i,
             CASE WHEN i = 1 THEN NULL ELSE ((i - 2) / 3) + 1 END,
             (['Engineering','Sales','Operations','Data'])[(i % 4) + 1],
             60000 + (i * 137 % 60) * 1000
      FROM generate_series(1, 121) AS t(i);
  `,
};
