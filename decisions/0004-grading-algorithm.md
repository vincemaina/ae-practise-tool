# 0004 — Output-equivalence grading algorithm

**Status:** Accepted (2026-06-22)
**Date:** 2026-06-22
**Related:** [`0003-expected-output-strategy.md`](./0003-expected-output-strategy.md), [`0002-dialect-strategy.md`](./0002-dialect-strategy.md)

## Context

We grade by comparing the user's query result set against the expected result set (computed at runtime from the canonical solution, ADR 0003) — **never** by SQL string matching. The brainstorm lists the dimensions that matter: column names, column order, row order (only when required), numeric tolerance, null handling, duplicate rows, type differences, determinism. This ADR fixes the exact comparison rules and the per-question knobs. This is core product IP and must be a **pure, heavily unit-tested module**.

## Options considered (≥3)

- **A. Strict total equality** (column names + order + row order + types must all match exactly). Rejected: brittle — fails correct answers over a column alias or `INT` vs `BIGINT`, frustrating learners.
- **B. Loose set comparison** (ignore order and duplicates; compare distinct values). Rejected: hides real bugs — a fanout/duplicate error would pass.
- **C. Multiset, value-normalised, with per-question rules** (positional columns, order-insensitive rows by default, duplicates significant, type-family normalisation, configurable tolerance/flags). **Chosen** — forgiving where differences are cosmetic, strict where they're real.

## Decision — the algorithm (option C)

`grade(expected, actual, opts) → { correct: boolean, diff }` — a pure function over two result sets (each = ordered columns + rows of cells).

**1. Columns**
- Column **count** must match (else incorrect).
- Columns compared **by position** (column order is significant).
- Column **names**: ignored for pass/fail by default (avoids false negatives from alias choices); opt in per question with `requireColumnNames: true` (case-insensitive). Name mismatches are always surfaced as informational feedback.

**2. Cell value normalisation** (applied before comparison)
- **Numeric family** (int/decimal/float): compared numerically, so `1` == `1.0`. Floating-point uses tolerance (see flags); integers/decimals exact unless tolerance set.
- **Temporal family** (date/time/timestamp): compared by normalised instant/value, not textual rendering.
- **Text**: compared as-is — case-sensitive, no trimming, by default (`caseSensitiveText: false` to relax).
- **Boolean**: normalised to true/false.
- **NULL**: canonicalised so NULL == NULL, and NULL ≠ `0`/`''`/`false`.
- **Cross-family mismatch** (e.g. text `'1'` vs number `1`) = not equal.

**3. Rows**
- Default **row order does not matter** → compare as a **multiset** (duplicates are significant: build a map from a stable serialisation of each normalised row to its count, compare maps).
- `orderMatters: true` (ranking/top-N/`ORDER BY` questions) → compare row sequences positionally.

**4. Diff for feedback**
- Return a structured diff (column-count mismatch, missing rows, extra rows, first differing row when ordered) so the UI can say *why* it's wrong without revealing the canonical answer. Granularity of what we show the user is a UX decision (ROADMAP Phase 3).

## Per-question config (content model)

Minimal, with safe defaults:
| Flag | Default | Meaning |
|---|---|---|
| `orderMatters` | `false` | Compare rows positionally instead of as a multiset |
| `requireColumnNames` | `false` | Column names must match (case-insensitive) |
| `numericTolerance` | `0` (exact); floats use a small relative epsilon | Allowed numeric difference |
| `caseSensitiveText` | `true` | Case-sensitive string comparison |

## Consequences

- **Positive:** forgiving on cosmetic differences (alias, int-vs-double, type labels), strict on real ones (wrong rows, duplicates, missing/extra data, wrong column set). Pure + deterministic → trivially unit-testable; this module gets the heaviest test coverage in the project.
- **Negative / to handle:**
  - Type-family normalisation needs care against DuckDB's returned types (BIGINT, HUGEINT, DECIMAL, TIMESTAMP_TZ, LIST/STRUCT/JSON). Nested types (LIST/STRUCT/JSON) need recursive normalisation — flag for when semi-structured questions arrive; not MVP-critical.
  - Default `requireColumnNames: false` means a question that's *about* naming must opt in — document this in the authoring guide.
  - Determinism is assumed (ADR 0003 validation test); a non-deterministic canonical under `orderMatters: false` is fine, but under `orderMatters: true` it must have a total ordering — the validation test should assert it.
