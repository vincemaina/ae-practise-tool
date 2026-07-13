---
title: Extract OutputDrawer (and MetricChips) from PracticeView
type: refactor
area: ui
priority: P3
effort: S
status: open
---

## Problem

`app/src/components/PracticeView.tsx` (428 lines) is mostly a clean async loop, but the output drawer (:331-424) is a self-contained ~100-line display block — five display inputs (`error/verdict/results/expected/revealed` + `drawerOpen/status`), zero engine logic — and the `status` chip derivation (:214-221) belongs with it. There's also an inline IIFE rendering metric chips (:236-247), a decomposition smell in miniature.

## Fix sketch

- `<OutputDrawer open onToggle status error verdict results expected revealed …>` in its own file; PracticeView becomes "problem panel + toolbar + editor + drawer" (~280 lines).
- Two-line `MetricChips` component replaces the IIFE.
- Nits while there: `hasOutput` (:214) is `string | GradeResult | ResultSet | boolean` — wrap in `Boolean()`; the JSDoc at :40-44 describing the practice loop is attached to `formatTime` — move it to the component; the static inline style at :414 belongs in `styles.css`.

## Acceptance criteria

- No behaviour/visual change: e2e loop spec + `pnpm screenshot` unchanged; typecheck/lint green.
