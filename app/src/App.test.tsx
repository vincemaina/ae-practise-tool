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
  window.location.hash = '';
  document.documentElement.removeAttribute('data-theme');
  cleanup();
});

describe('App', () => {
  it('opens on the problem list with logo + progress', () => {
    render(<App />);
    expect(screen.getByLabelText('All problems')).toBeTruthy(); // logo button
    expect(screen.getByTestId('progress').getAttribute('aria-label')).toContain('Solved 0 of');
    expect(screen.getByTestId('q-orders-by-status')).toBeTruthy();
    // The solve view is not shown until a problem is opened.
    expect(screen.queryByTestId('question-title')).toBeNull();
  });

  it('opening a problem navigates to the solve view', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('q-top-completed-order-per-customer'));
    expect(screen.getByTestId('question-title').textContent).toContain('Largest completed order');
    // Solve view has the back link and editor.
    expect(screen.getByTestId('back')).toBeTruthy();
  });

  it('back returns to the list', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('q-orders-by-status'));
    expect(screen.getByTestId('question-title')).toBeTruthy();
    fireEvent.click(screen.getByTestId('back'));
    expect(screen.queryByTestId('question-title')).toBeNull();
    expect(screen.getByTestId('q-orders-by-status')).toBeTruthy();
  });

  it('filtering by difficulty narrows the list', () => {
    render(<App />);
    fireEvent.change(screen.getByTestId('filter-difficulty'), { target: { value: 'hard' } });
    expect(screen.queryByTestId('q-orders-by-status')).toBeNull();
    expect(screen.getByTestId('q-top-completed-order-per-customer')).toBeTruthy();
  });

  it('searching filters by title', () => {
    render(<App />);
    fireEvent.change(screen.getByTestId('search'), { target: { value: 'revenue' } });
    expect(screen.getByTestId('q-customer-completed-revenue')).toBeTruthy();
    expect(screen.queryByTestId('q-orders-by-status')).toBeNull();
  });

  it('filters by concept (from derived metadata)', () => {
    render(<App />);
    fireEvent.change(screen.getByTestId('filter-concept'), { target: { value: 'Window functions' } });
    expect(screen.getByTestId('q-sessions-per-user')).toBeTruthy();
    expect(screen.queryByTestId('q-orders-by-status')).toBeNull();
  });

  it('opening a learning track filters to its questions', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('track-window'));
    expect(screen.getByTestId('q-sessions-per-user')).toBeTruthy();
    expect(screen.queryByTestId('q-orders-by-status')).toBeNull();
    fireEvent.click(screen.getByTestId('clear-track'));
    expect(screen.getByTestId('q-orders-by-status')).toBeTruthy();
  });

  it('shows a recommended-next banner on the list', () => {
    render(<App />);
    expect(screen.getByTestId('recommended')).toBeTruthy();
  });

  it('marks debug challenges with a Debug badge', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('q-debug-distinct-purchasers'));
    expect(screen.getByText('🐞 Debug')).toBeTruthy();
  });

  it('toggles the theme via the profile menu', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('profile'));
    fireEvent.click(screen.getByLabelText(/switch to .* mode/i));
    expect(document.documentElement.dataset.theme).toBeTruthy();
    expect(localStorage.getItem('ae-practice:theme')).toBeTruthy();
  });
});
