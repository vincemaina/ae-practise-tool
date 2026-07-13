// @vitest-environment jsdom
// Regression test for issue 0009: LearnView's due queue is snapshotted into
// local state on mount (`useState(() => dueCards(...))`), so switching decks
// only produces a fresh queue if React actually remounts the component. The
// fix is for the caller (App.tsx) to render `<LearnView key={deck.id} .../>`;
// this test drives LearnView directly the same way — rerendering with a
// changed `key` — to prove a deck switch resets the queue instead of carrying
// over the previous deck's (possibly partially-reviewed) local state.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { Deck, LearnStore } from '../learn';
import { LearnView } from './LearnView';

afterEach(() => cleanup());

function makeStore(): LearnStore {
  return {
    states: () => ({}),
    getState: () => undefined,
    review: vi.fn(),
    dueCount: (cards) => cards.length,
    reviewedToday: () => 0,
  };
}

const deckA: Deck = {
  id: 'deck-a',
  title: 'Deck A',
  description: 'first deck',
  cards: [
    { id: 'a1', front: 'A1 front', back: 'A1 back' },
    { id: 'a2', front: 'A2 front', back: 'A2 back' },
  ],
};

const deckB: Deck = {
  id: 'deck-b',
  title: 'Deck B',
  description: 'second deck',
  cards: [
    { id: 'b1', front: 'B1 front', back: 'B1 back' },
    { id: 'b2', front: 'B2 front', back: 'B2 back' },
    { id: 'b3', front: 'B3 front', back: 'B3 back' },
  ],
};

describe('LearnView deck switch (issue 0009)', () => {
  it('resets the queue to the new deck when rerendered with key={deck.id}', () => {
    const store = makeStore();
    const { rerender } = render(
      <LearnView key={deckA.id} deck={deckA} store={store} onReview={vi.fn()} />,
    );
    expect(screen.getByTestId('learn-remaining').textContent).toContain('2 to review');

    // Review one card of deck A so its local queue shrinks — if this state
    // ever leaked into deck B, the bug would be visible as a stale count/card.
    fireEvent.click(screen.getByTestId('flashcard-reveal'));
    fireEvent.click(screen.getByTestId('rate-got-it'));
    expect(screen.getByTestId('learn-remaining').textContent).toContain('1 to review');

    // Switch decks the way App.tsx does: key={deck.id} forces a remount.
    rerender(<LearnView key={deckB.id} deck={deckB} store={store} onReview={vi.fn()} />);

    // Queue reflects deck B fresh (all 3 cards), not deck A's leftover count/card.
    expect(screen.getByTestId('learn-remaining').textContent).toContain('3 to review');
    expect(screen.getByTestId('flashcard-front').textContent).toBe('B1 front');
    expect(screen.queryByTestId('flashcard-back')).toBeNull(); // unrevealed, fresh card
  });
});
