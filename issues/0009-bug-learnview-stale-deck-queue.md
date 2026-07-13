---
title: LearnView review queue goes stale if the deck ever changes without a remount
type: bug
area: ui
priority: P3
effort: S
status: done
---

## Problem

`app/src/components/LearnView.tsx:22-27`: `initialQueue` is memoized on `deck.id`, but `useState(initialQueue)` reads it only on mount. Today there is exactly one deck so nothing breaks — but the moment a second deck ships (planned; see ADR 0007 follow-ups and issue 0021), switching decks without a remount silently keeps showing the old deck's cards.

## Fix sketch

Have the parent render `<LearnView key={deck.id} …>` (the remount-on-identity pattern other views already use), or add a reset effect on `deck.id`. The `key` approach is one line and removes the `eslint-disable react-hooks/exhaustive-deps` at :24.

## Acceptance criteria

- A test rendering LearnView with deck A then deck B asserts the queue resets.
- Fix lands before/with the second deck (issue 0021).

## Resolution

Fixed at the call site as sketched: `app/src/App.tsx` now renders
`<LearnView key={dbtDeck.id} deck={dbtDeck} store={learn} onReview={onCardReview} />`,
matching the existing `<DbtWorkspace key={modelChallenge.id} .../>` remount-on-identity
pattern right above it. When a second deck ships and the app picks a `deck` dynamically,
switching decks will unmount/remount `LearnView` and rebuild the queue instead of reusing
stale local state.

Also simplified `LearnView.tsx`: the `useMemo(..., [deck.id])` +
`eslint-disable-next-line react-hooks/exhaustive-deps` was replaced with a lazy
`useState` initializer (`useState<Flashcard[]>(() => dueCards(deck.cards, store.states(),
todayKey()))`). Since the key-based remount guarantees `deck`/`store` never change within
one mounted instance, the initializer only ever needs to run once per mount — no memo, no
deps array, no lint suppression needed.

Added `app/src/components/LearnView.test.tsx`: renders `LearnView` with deck A
(2 cards), reviews one card so the local queue shrinks to 1, then `rerender`s with
deck B (3 cards) using a changed `key` (mirroring the App.tsx call site) and asserts
the queue/remaining-count/front-card reset to deck B's fresh state rather than
carrying over deck A's partially-reviewed queue.

Verification: `pnpm typecheck && pnpm lint && pnpm test` all green (192/192 tests
passing across 21 files). The one lint error seen mid-session (`dbt/challenge.ts`
unused import) was from a concurrently-running agent's in-progress edit elsewhere
in the repo, not from this change — scoped `eslint` on the touched files
(`App.tsx`, `LearnView.tsx`, `LearnView.test.tsx`) was clean.
