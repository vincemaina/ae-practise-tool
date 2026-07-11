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

  it('filters questions by SQL dialect (QUALIFY hidden under Postgres)', () => {
    render(<App />);
    // q-top-completed-order-per-customer uses QUALIFY → tagged snowflake/bigquery.
    expect(screen.getByTestId('q-top-completed-order-per-customer')).toBeTruthy();
    fireEvent.change(screen.getByTestId('filter-dialect'), { target: { value: 'postgres' } });
    expect(screen.queryByTestId('q-top-completed-order-per-customer')).toBeNull();
    // a portable question is still there
    expect(screen.getByTestId('q-orders-by-status')).toBeTruthy();
    fireEvent.change(screen.getByTestId('filter-dialect'), { target: { value: 'snowflake' } });
    expect(screen.getByTestId('q-top-completed-order-per-customer')).toBeTruthy();
  });

  it('marks debug challenges with a Debug badge', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('q-debug-distinct-purchasers'));
    expect(screen.getByText('🐞 Debug')).toBeTruthy();
  });

  it('runs a practice session with a progress counter that advances', () => {
    render(<App />);
    // Open the session setup, which shows a live count (10 unsolved by default).
    fireEvent.click(screen.getByTestId('start-session'));
    expect(screen.getByTestId('session-count').textContent).toContain('10 questions');

    // Start it → land on the first question with a "Session · 1/10" chip.
    fireEvent.click(screen.getByTestId('session-start'));
    expect(screen.getByTestId('question-title')).toBeTruthy();
    expect(screen.getByTestId('session-progress').textContent).toContain('Session · 1/10');
    // Shuffle is replaced by the session chip while in a session.
    expect(screen.queryByTestId('shuffle')).toBeNull();

    // Next advances the counter within the queue.
    fireEvent.click(screen.getByLabelText('Next problem'));
    expect(screen.getByTestId('session-progress').textContent).toContain('Session · 2/10');

    // Back exits the session (chip gone, session cleared from storage).
    fireEvent.click(screen.getByTestId('back'));
    expect(screen.queryByTestId('session-progress')).toBeNull();
    expect(localStorage.getItem('ae-practice:session')).toBeNull();
  });

  it('session length and pool controls change the count', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('start-session'));
    fireEvent.click(screen.getByTestId('session-size-5'));
    expect(screen.getByTestId('session-count').textContent).toContain('5 questions');
    // "Needs review" with no prior attempts yields nothing → Start disabled.
    fireEvent.click(screen.getByTestId('session-pool-review'));
    expect(screen.getByTestId('session-count').textContent).toMatch(/No questions/);
    expect((screen.getByTestId('session-start') as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows the schema inline, with sample rows behind a toggle', async () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('q-orders-by-status'));
    // Columns are shown inline; sample rows are collapsed behind a toggle.
    const toggle = await screen.findByTestId('toggle-schema-data', {}, { timeout: 4000 });
    expect(toggle.textContent).toContain('Show sample rows');
    fireEvent.click(toggle);
    expect(screen.getByTestId('toggle-schema-data').textContent).toContain('Hide sample rows');
  });

  it('Learn mode: flip a flashcard, rate it, and it counts toward the streak', () => {
    render(<App />);
    expect(screen.queryByTestId('streak')).toBeNull(); // no activity yet

    // Switch to Learn via the top-bar tab.
    fireEvent.click(screen.getByTestId('tab-learn'));
    expect(screen.getByTestId('flashcard-front')).toBeTruthy();
    expect(screen.queryByTestId('flashcard-back')).toBeNull(); // answer hidden until flip

    const remaining = () =>
      Number(/(\d+)/.exec(screen.getByTestId('learn-remaining').textContent ?? '')![1]);
    const before = remaining();

    // Flip, then rate "Got it".
    fireEvent.click(screen.getByTestId('flashcard-reveal'));
    expect(screen.getByTestId('flashcard-back')).toBeTruthy();
    fireEvent.click(screen.getByTestId('rate-got-it'));

    // Card retired (queue shrank) and the review lit the daily streak.
    expect(remaining()).toBe(before - 1);
    expect(screen.getByTestId('streak')).toBeTruthy();

    // Back to Practice.
    fireEvent.click(screen.getByTestId('tab-practice'));
    expect(screen.getByTestId('q-orders-by-status')).toBeTruthy();
  });

  it('toggles the theme via the profile menu', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('profile'));
    fireEvent.click(screen.getByLabelText(/switch to .* mode/i));
    expect(document.documentElement.dataset.theme).toBeTruthy();
    expect(localStorage.getItem('ae-practice:theme')).toBeTruthy();
  });
});
