import { describe, it, expect } from 'vitest';
import { filesToModels } from './challenge';

describe('filesToModels', () => {
  it('turns models/*.sql files into named models', () => {
    const models = filesToModels({
      'models/stg_orders.sql': 'select 1',
      'models/orders_mart.sql': "select * from {{ ref('stg_orders') }}",
    });
    expect(models.map((m) => m.name).sort()).toEqual(['orders_mart', 'stg_orders']);
    expect(models.find((m) => m.name === 'stg_orders')?.sql).toBe('select 1');
  });

  it('ignores non-model files (yml, nested dirs outside models/)', () => {
    const models = filesToModels({
      'models/a.sql': 'select 1',
      'models/schema.yml': 'version: 2',
      'seeds/data.csv': 'a,b',
      'dbt_project.yml': 'name: x',
    });
    expect(models.map((m) => m.name)).toEqual(['a']);
  });
});
