import { describe, it, expect } from 'vitest';
import { checkStructure, gradeSubmission } from './grade';
import type { DbtStructureCheck } from './challenge';
import type { ResultSet } from '../grading/types';

const INCREMENTAL: DbtStructureCheck[] = [
  { model: 'mart', materialized: 'incremental', mustUse: ['ref(', 'is_incremental'], message: 'must be incremental' },
];

const rs = (rows: number[][]): ResultSet => ({ columns: [{ name: 'n', type: 'number' }], rows });

describe('checkStructure', () => {
  it('passes when the model meets the materialization + construct requirements', () => {
    const files = {
      'models/mart.sql': "{{ config(materialized='incremental', unique_key='id') }} select * from {{ ref('stg') }} {% if is_incremental() %}where 1{% endif %}",
    };
    expect(checkStructure(files, INCREMENTAL)).toEqual([]);
  });

  it('fails a right-output-wrong-way submission (table instead of incremental)', () => {
    const files = { 'models/mart.sql': "{{ config(materialized='table') }} select * from {{ ref('stg') }}" };
    expect(checkStructure(files, INCREMENTAL)).toEqual(['must be incremental']);
  });

  it('fails when a required construct is missing (no ref)', () => {
    const files = { 'models/mart.sql': "{{ config(materialized='incremental') }} select * from stg {% if is_incremental() %}x{% endif %}" };
    expect(checkStructure(files, INCREMENTAL)).toHaveLength(1);
  });

  it('fails when the model file is absent', () => {
    expect(checkStructure({}, INCREMENTAL)).toEqual(['must be incremental']);
  });
});

describe('gradeSubmission', () => {
  const files = { 'models/mart.sql': "{{ config(materialized='incremental') }} select * from {{ ref('s') }} {% if is_incremental() %}x{% endif %}" };

  it('correct when output matches AND structure passes', () => {
    const r = gradeSubmission(rs([[1], [2]]), rs([[2], [1]]), { grading: {}, checks: INCREMENTAL, files });
    expect(r.correct).toBe(true);
  });

  it('incorrect (with the structural reason) when output matches but structure fails', () => {
    const tableFiles = { 'models/mart.sql': "{{ config(materialized='table') }} select * from {{ ref('s') }}" };
    const r = gradeSubmission(rs([[1]]), rs([[1]]), { grading: {}, checks: INCREMENTAL, files: tableFiles });
    expect(r.correct).toBe(false);
    expect(r.reasons).toContain('must be incremental');
  });

  it('incorrect (with the output diff) when the rows are wrong', () => {
    const r = gradeSubmission(rs([[1], [2]]), rs([[1]]), { grading: {}, checks: INCREMENTAL, files });
    expect(r.correct).toBe(false);
    expect(r.reasons.length).toBeGreaterThan(0);
  });
});
