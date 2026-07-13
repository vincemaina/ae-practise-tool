---
title: "Quick-wins bundle: session summary, mastery grid, PNG icons, second deck, Snowflake path, question-of-the-day"
type: feature
area: app
priority: P2
effort: M
status: open
---

Six independent ~day-sized items from the 2026-07-13 product review. Each can be its own PR/session; split this issue if useful.

1. **End-of-session summary** — sessions currently dead-end (ROADMAP calls this an "easy follow-up"). On queue completion show: n solved / n attempted, per-question time (timer data exists), concepts touched, misses added to Needs Review, "start another" CTA. Optional whole-session countdown for timed-interview mode.
2. **Per-concept mastery grid** — `recommendNext` already computes per-concept weakness internally (`app/src/content/index.ts`), and `questionConcepts`/progress data exist. Render a small grid (Joins / Windows / CTEs / Grouping / Semi-structured: solved/attempted) on the Problems page or profile menu. Makes the adaptive recommendation legible; answers "am I interview-ready, where am I weak?"
3. **PNG manifest icons** — ROADMAP Phase 4 TODO: manifest ships only the SVG so the PWA install prompt is unreliable (Chrome/Android want PNG 192 + 512 incl. maskable). Generate from `app/public/icon.svg` at build or commit generated PNGs; add to the `vite-plugin-pwa` manifest `icons`.
4. **Second flashcard deck** — Learn has one deck (dbt, 32 cards). Add "Window functions" or "SQL anti-patterns" (`app/src/learn/decks/`, follow `dbt.ts`'s web-verified card style). Requires the deck-switch fix (issue 0009) and a minimal deck picker in `LearnView`.
5. **Snowflake learning path** — 12 `sf-*` questions and a dialect picker exist, but no Snowflake track in `app/src/content/paths.ts`. One entry.
6. **Question of the day** — deterministic daily pick seeded by the date (hash of `YYYY-MM-DD` over the question list — no backend), shown as a "Today's challenge" slot on the list page, feeding the existing streak. Consider showing due-flashcard count in the top bar alongside it ("3 cards due") so Learn pulls users back too.

## Acceptance criteria

Per item: unit/jsdom test where logic exists (summary derivation, daily-pick determinism), screenshots reviewed via `pnpm screenshot`, full baseline green.
