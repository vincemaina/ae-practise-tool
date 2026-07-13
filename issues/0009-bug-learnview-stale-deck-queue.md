---
title: LearnView review queue goes stale if the deck ever changes without a remount
type: bug
area: ui
priority: P3
effort: S
status: open
---

## Problem

`app/src/components/LearnView.tsx:22-27`: `initialQueue` is memoized on `deck.id`, but `useState(initialQueue)` reads it only on mount. Today there is exactly one deck so nothing breaks — but the moment a second deck ships (planned; see ADR 0007 follow-ups and issue 0021), switching decks without a remount silently keeps showing the old deck's cards.

## Fix sketch

Have the parent render `<LearnView key={deck.id} …>` (the remount-on-identity pattern other views already use), or add a reset effect on `deck.id`. The `key` approach is one line and removes the `eslint-disable react-hooks/exhaustive-deps` at :24.

## Acceptance criteria

- A test rendering LearnView with deck A then deck B asserts the queue resets.
- Fix lands before/with the second deck (issue 0021).
