# 0007 — Learn mode: spaced-repetition flashcards

**Status:** Accepted (2026-07-10)
**Date:** 2026-07-10
**Related:** ROADMAP idea backlog ("Learning mode, not just practice"); pairs with the progress/streak store (`storage/progress.ts`).

## Context
The app is a *practice* tool (write SQL → grade). The roadmap backlog long carried a
second pillar: a **study/learn** mode with spaced-repetition **flashcards**, first
target **dbt** (commands, concepts, features). This is a distinct interaction from the
solve loop — recall, not authoring — so it needs its own surface, content model, and
scheduling. Building the first cut now (user go-ahead 2026-07-10). Non-goals for v1:
multiple decks, a deck-authoring UI, SQL-concept decks, rich stats.

## Decisions & options considered (≥3 where it mattered)

**1. Where Learn lives (navigation).**
- **Top-level Practice | Learn tabs (chosen)** — a mode switch in the top bar; `#/learn`
  route. Most discoverable; signals the two-pillar split clearly.
- Learn as an entry card on the problem list — lighter, but buries a whole mode.
- Learn as another "track" — rejected; flashcards aren't the solve loop.

**2. Spaced-repetition scheduling.**
- **Leitner boxes (chosen)** — 5 boxes, escalating intervals (~1·2·4·8·16 days); "Got it"
  moves a card up a box, "Again" resets to box 1 (due same day → relearn this session).
  Transparent, minimal, easy to unit-test. Two buttons.
- SM-2 / Anki (ease factor + 4 ratings) — better long-term scheduling, more moving parts;
  overkill for a first deck. Revisit if retention data warrants.
- Fixed flat interval — too blunt; no strengthening of well-known cards.

**3. Card grading** — **self-rated** (flashcards are inherently self-assessed: flip → rate).
No typed answer / output grading (that's the Practice pillar).

**4. Streak** — a card review counts toward the **existing daily streak** (shared with
Practice) via a new `progress.touchStreak()`, so both pillars feed one habit loop.

## Consequences
- **Positive:** a second learning mode with no backend (localStorage review state); reuses
  the streak; clean separation (`src/learn/` = cards + Leitner + store, independent of the
  SQL `content/`).
- **Negative / mitigations:** Leitner is coarser than SM-2 (accepted for v1; swappable —
  the scheduler is a pure module). Card content accuracy matters (teaching wrong facts is
  worse than none) → the dbt deck is authored from web-verified official docs, not memory.
- **Follow-ups:** more decks (SQL concepts), SM-2 upgrade if needed, per-deck progress UI,
  a "reset deck" control, PNG-quality polish.
