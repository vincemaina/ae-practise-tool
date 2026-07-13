// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import type { DbtChallenge } from '../dbt';

// Mock the engine so the workspace mounts without booting real DuckDB-Wasm
// (mirrors the pattern in App.test.tsx / PracticeView.test.tsx).
const dbtInit = vi.fn();
const listWarehouseObjects = vi.fn(async () => []);

vi.mock('../engine/duckdb', () => ({
  dbtInit: (...args: unknown[]) => dbtInit(...(args as [])),
  listWarehouseObjects: (...args: unknown[]) => listWarehouseObjects(...(args as [])),
  dbtRunCommand: vi.fn(async () => ({ lines: [] })),
  dbtQuery: vi.fn(async () => ({ columns: [], rows: [] })),
  buildDbtTarget: vi.fn(async () => ({ columns: [], rows: [] })),
}));

import { DbtWorkspace } from './DbtWorkspace';

// jsdom doesn't implement Element.scrollTo; the terminal-log auto-scroll effect calls it.
if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {};
}

const challenge: DbtChallenge = {
  id: 'test-challenge',
  slug: 'test-challenge',
  title: 'Test challenge',
  prompt: 'Do the thing.',
  sources: "CREATE OR REPLACE TABLE raw_orders (id INTEGER);",
  starter: { 'models/stg_orders.sql': 'select * from {{ source(\'raw\', \'orders\') }}' },
  solution: { 'models/stg_orders.sql': 'select * from {{ source(\'raw\', \'orders\') }}' },
  target: 'stg_orders',
  grading: {},
};

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});

describe('DbtWorkspace — dbtInit failure (issue 0007)', () => {
  it('shows a visible error banner when dbtInit rejects, instead of silently emptying sources', async () => {
    dbtInit.mockRejectedValue(new Error('engine failed to boot'));

    render(<DbtWorkspace challenge={challenge} dark={false} />);

    const banner = await screen.findByTestId('error');
    expect(banner.textContent).toMatch(/Failed to load the SQL engine/);
    expect(banner.textContent).toMatch(/engine failed to boot/);
  });

  it('happy path: no error banner when dbtInit resolves', async () => {
    dbtInit.mockResolvedValue([{ name: 'raw_orders', columns: [{ name: 'id', type: 'INTEGER' }], rows: [] }]);

    render(<DbtWorkspace challenge={challenge} dark={false} />);

    await waitFor(() => expect(screen.getByTestId('challenge-title')).toBeTruthy());
    expect(screen.queryByTestId('error')).toBeNull();
  });
});
