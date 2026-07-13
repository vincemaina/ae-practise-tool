// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import type { Question, Dataset } from '../content/types';
import type { ResultSet } from '../grading/types';

// Regression test for issue 0001: user SQL can mutate the shared dataset
// (UPDATE/DELETE/DROP/…), and grading must not be fooled by that — a genuinely
// correct answer must not grade Incorrect (or a wrong one Correct) just because
// the table was left dirty by an earlier Run.
//
// A tiny stateful fake stands in for `engine/duckdb.ts` (rather than the
// pure no-op stubs App.test.tsx uses) so the test can actually observe
// re-seed-before-grading behaviour without booting real DuckDB-Wasm. Questions
// use `challengeType: 'debug'` with a pre-filled `starterSql` so Run/Submit are
// driven without needing to type into the CodeMirror editor (which isn't
// practical to drive from jsdom) — the starter *is* the submitted query.
let rows: number[];
let mutated: boolean;
const SEED = [1, 2, 3];

function resultOf(ids: number[]): ResultSet {
  return { columns: [{ name: 'id', type: 'INTEGER' }], rows: ids.map((id) => [id]) };
}

const ensureDataset = vi.fn(async () => {
  if (mutated) {
    rows = [...SEED];
    mutated = false;
  }
});
const runQuery = vi.fn(async (sql: string) => {
  const q = sql.trim();
  if (q === 'DELETE FROM orders') {
    rows = [];
    mutated = true;
    return resultOf([]);
  }
  if (q === 'SELECT * FROM orders') return resultOf(rows);
  if (q === 'SELECT id FROM orders WHERE 1=0') return resultOf([]); // a deliberately wrong answer
  throw new Error(`fake engine: unexpected query ${JSON.stringify(sql)}`);
});

vi.mock('../engine/duckdb', () => ({
  ensureDataset: (...args: unknown[]) => ensureDataset(...(args as [])),
  runQuery: (...args: [string, ...unknown[]]) => runQuery(args[0]),
  validateSql: vi.fn(async () => null),
}));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

const dataset: Dataset = {
  id: 'orders-ds',
  title: 'Orders',
  setupSql: 'CREATE OR REPLACE TABLE orders (id INT)',
  tables: [{ name: 'orders', columns: ['id'] }],
};

vi.mock('../content', () => ({
  getDataset: () => dataset,
  getMetrics: () => undefined,
}));

import { PracticeView } from './PracticeView';

function baseQuestion(starterSql: string): Question {
  return {
    id: 'q1',
    slug: 'q1',
    title: 'All orders',
    prompt: 'Return every order id.',
    difficulty: 'easy',
    packs: [],
    dialects: ['generic'],
    datasetId: dataset.id,
    canonical: { generic: 'SELECT * FROM orders' },
    grading: {},
    // Pre-fill the editor so Submit is driven without typing into CodeMirror.
    challengeType: 'debug',
    starterSql,
  };
}

async function renderReadyView(starterSql: string) {
  render(
    <PracticeView
      question={baseQuestion(starterSql)}
      onAttempt={vi.fn()}
      onNext={vi.fn()}
      dark={false}
      dialect="all"
    />,
  );
  await waitFor(() =>
    expect((screen.getByTestId('submit') as HTMLButtonElement).disabled).toBe(false),
  );
}

beforeEach(() => {
  rows = [...SEED];
  mutated = false;
  ensureDataset.mockClear();
  runQuery.mockClear();
});
afterEach(() => cleanup());

describe('dataset mutation is repaired before grading (issue 0001)', () => {
  it('a genuinely correct answer still grades Correct after an earlier query mutated the table', async () => {
    await renderReadyView('SELECT * FROM orders');

    // Simulate an earlier Run of a mutating query (e.g. the user poking at the
    // table) — goes through the same mocked `runQuery` the component uses, so
    // it dirties the shared fake-engine state exactly like a real Run would.
    await runQuery('DELETE FROM orders');
    expect(rows).toEqual([]);

    fireEvent.click(screen.getByTestId('submit'));
    await waitFor(() => expect(screen.getByTestId('verdict').textContent).toBe('Correct'));
  });

  it('the DELETE-then-submit-empty-result failure scenario now grades Incorrect', async () => {
    await renderReadyView('SELECT id FROM orders WHERE 1=0'); // returns 0 rows either way

    await runQuery('DELETE FROM orders');
    expect(rows).toEqual([]);

    fireEvent.click(screen.getByTestId('submit'));
    // Pre-fix: expected (computed over the still-corrupted table) was also
    // empty, so this silently graded Correct. Post-fix, grading re-seeds first,
    // so the empty submission is compared against the real (non-empty) expected
    // output and correctly marked wrong.
    await waitFor(() => expect(screen.getByTestId('verdict').textContent).toBe('Incorrect'));
  });

  it('re-seeds via ensureDataset before computing expected/grading', async () => {
    await renderReadyView('SELECT * FROM orders');
    ensureDataset.mockClear();

    await runQuery('DELETE FROM orders');
    fireEvent.click(screen.getByTestId('submit'));
    await waitFor(() => expect(screen.getByTestId('verdict')).toBeTruthy());

    expect(ensureDataset).toHaveBeenCalled();
  });
});
