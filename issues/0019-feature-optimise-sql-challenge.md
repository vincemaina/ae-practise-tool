---
title: "Optimise this SQL" challenge type (second half of dev feedback #19)
type: feature
area: content
priority: P2
effort: L
status: open
---

## Problem

Dev-feedback #19 also asks for challenges where you're given working-but-inefficient SQL and must optimise it — and whether EXPLAIN could grade efficiency. Market research (`notes/research/feature-ideas-2026.md`) flags performance-at-scale as the junior→senior signal. No competitor does this client-side.

## Fix sketch (v1 — reuse existing machinery)

The pieces already exist: `challengeType`/`starterSql` (debug challenges), `requires` pattern assertions (pre-transpile regex on user SQL), and real `EXPLAIN` access (used for editor squiggles).

1. New `challengeType: 'optimize'`: editor pre-fills a *correct but inefficient* `starterSql`; grading = output-equivalence **plus** anti-pattern checks. Extend `requires` to support negative assertions (e.g. `forbids: { pattern, message }` — "no CROSS JOIN", "no correlated subquery", "don't self-join; use a window function").
2. Discuss-first (per working agreement — this is a product decision): an EXPLAIN-based heuristic (compare operator counts / estimated cardinality vs the canonical plan via `EXPLAIN (FORMAT JSON)`) as a stretch goal; regex anti-patterns may be enough for v1.
3. Datasets are ~1000 rows, so slow queries won't *feel* slow — consider a 100k-row generated variant (the deterministic `generate_series` pattern scales) for these questions specifically, so the timer difference is visible.
4. 4–6 questions: correlated subquery → window; self-join → LAG; repeated CTE scan → single pass; DISTINCT papering over a bad join; SELECT * in a wide join.

## Acceptance criteria

- `verify:content` asserts each canonical passes its own `forbids`/`requires` and each starter is correct-but-flagged (mirrors the debug-challenge starter check).
- Wrong-way-but-right-rows submissions grade Incorrect with the anti-pattern's message.
