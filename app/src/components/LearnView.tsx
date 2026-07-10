import { useMemo, useState } from 'react';
import type { Deck, Flashcard, LearnStore } from '../learn';
import { dueCards } from '../learn';

/**
 * Flashcard review screen (Leitner spaced repetition). Builds the due queue for
 * a deck, shows one card at a time (front → flip → rate), and reschedules via the
 * store. "Again" re-queues the card for later this session; "Got it" retires it.
 * Each review calls `onReview` so the app can bump the shared daily streak.
 */
export function LearnView({
  deck,
  store,
  onReview,
}: {
  deck: Deck;
  store: LearnStore;
  onReview: () => void;
}) {
  // Snapshot the due queue once on mount; reviews mutate the store, but we drive
  // the session from this local queue so a re-scheduled card doesn't vanish mid-flip.
  const initialQueue = useMemo(
    () => dueCards(deck.cards, store.states(), todayKey()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deck.id],
  );
  const [queue, setQueue] = useState<Flashcard[]>(initialQueue);
  const [revealed, setRevealed] = useState(false);

  const current = queue[0];

  function rate(rating: 'again' | 'got-it') {
    if (!current) return;
    store.review(current.id, rating);
    onReview();
    const [head, ...rest] = queue;
    // "Again" sends the card to the back of this session's queue to see again.
    setQueue(rating === 'again' ? [...rest, head!] : rest);
    setRevealed(false);
  }

  return (
    <main className="page learn-page">
      <div className="list-head">
        <h1 className="page-title">{deck.title}</h1>
        {current && (
          <span className="muted" data-testid="learn-remaining">
            {queue.length} to review
          </span>
        )}
      </div>

      {current ? (
        <div className="card flashcard" data-testid="flashcard">
          <div className="flashcard-front" data-testid="flashcard-front">
            {current.front}
          </div>

          {revealed ? (
            <>
              <div className="flashcard-back" data-testid="flashcard-back">
                <p>{current.back}</p>
                {current.code && <pre className="flashcard-code">{current.code}</pre>}
              </div>
              <div className="flashcard-actions">
                <button type="button" onClick={() => rate('again')} data-testid="rate-again">
                  Again
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={() => rate('got-it')}
                  data-testid="rate-got-it"
                >
                  Got it
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              className="primary flashcard-reveal"
              onClick={() => setRevealed(true)}
              data-testid="flashcard-reveal"
            >
              Show answer
            </button>
          )}
        </div>
      ) : (
        <div className="card learn-done" data-testid="learn-done">
          <strong>All caught up 🎉</strong>
          <p className="muted">
            You reviewed {store.reviewedToday()} card{store.reviewedToday() === 1 ? '' : 's'} today.
            {' '}Come back tomorrow to keep them fresh.
          </p>
        </div>
      )}
    </main>
  );
}

/** Local YYYY-MM-DD (matches the store's clock). */
function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
