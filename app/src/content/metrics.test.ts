import { describe, it, expect } from 'vitest';
import { extractMetrics, metricTags } from './metrics';

// A hand-built parse tree exercising every counter. CTE name `x` must be
// excluded from the real-tables list.
const ast = JSON.stringify({
  statements: [
    {
      node: {
        type: 'SELECT_NODE',
        cte_map: { map: [{ key: 'x', value: {} }] },
        modifiers: [{ type: 'ORDER_MODIFIER' }, { type: 'DISTINCT_MODIFIER' }],
        group_expressions: [{ class: 'COLUMN_REF' }],
        from_table: {
          type: 'JOIN',
          left: { type: 'BASE_TABLE', table_name: 'a' },
          right: { type: 'BASE_TABLE', table_name: 'x' },
        },
        select_list: [
          { class: 'WINDOW' },
          { class: 'FUNCTION', function_name: 'sum' },
          { class: 'FUNCTION', function_name: 'lower' }, // scalar, not aggregate
          { class: 'SUBQUERY' },
        ],
      },
    },
  ],
});

describe('extractMetrics', () => {
  const m = extractMetrics(ast);

  it('counts joins, window functions, CTEs, aggregates, subqueries', () => {
    expect(m.joins).toBe(1);
    expect(m.windowFunctions).toBe(1);
    expect(m.ctes).toBe(1);
    expect(m.aggregates).toBe(1); // sum only; lower is scalar
    expect(m.subqueries).toBe(1);
  });

  it('lists real tables only (excludes CTE names) and flags clauses', () => {
    expect(m.tables).toEqual(['a']);
    expect(m.tableCount).toBe(1);
    expect(m.groupBy).toBe(true);
    expect(m.orderBy).toBe(true);
    expect(m.distinct).toBe(true);
  });

  it('renders readable chips', () => {
    expect(metricTags(m)).toContain('1 table');
    expect(metricTags(m)).toContain('1 join');
    expect(metricTags(m)).toContain('window function');
  });
});
