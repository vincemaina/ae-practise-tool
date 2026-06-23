// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

// Mock the engine so the UI tree mounts without DuckDB-Wasm / workers.
vi.mock('./engine/duckdb', () => ({
  ensureDataset: vi.fn(async () => {}),
  runQuery: vi.fn(async () => ({ columns: [], rows: [] })),
  validateSql: vi.fn(async () => null),
}));
// canvas-confetti touches canvas APIs jsdom lacks; stub it.
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

import App from './App';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  cleanup();
});

describe('App shell', () => {
  it('renders the brand, progress, and a question', () => {
    render(<App />);
    expect(screen.getByText('AE Practice')).toBeTruthy();
    expect(screen.getByTestId('progress').textContent).toContain('Solved 0/');
    expect(screen.getByTestId('question-title').textContent).toBeTruthy();
  });

  it('selecting a question from the list updates the problem panel', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('q-top-completed-order-per-customer'));
    expect(screen.getByTestId('question-title').textContent).toContain('Largest completed order');
  });

  it('filtering by difficulty narrows the list', () => {
    render(<App />);
    fireEvent.change(screen.getByTestId('filter-difficulty'), { target: { value: 'hard' } });
    expect(screen.queryByTestId('q-orders-by-status')).toBeNull();
    expect(screen.getByTestId('q-top-completed-order-per-customer')).toBeTruthy();
  });

  it('toggles the theme and persists it', () => {
    render(<App />);
    const toggle = screen.getByLabelText(/switch to .* mode/i);
    fireEvent.click(toggle);
    expect(document.documentElement.dataset.theme).toBeTruthy();
    expect(localStorage.getItem('ae-practice:theme')).toBeTruthy();
  });
});
