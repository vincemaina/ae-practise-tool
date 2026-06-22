# 0003 — Expected-output strategy

**Status:** Accepted (2026-06-22)
**Date:** 2026-06-22
**Related:** [`0001-browser-sql-engine.md`](./0001-browser-sql-engine.md), [`0002-dialect-strategy.md`](./0002-dialect-strategy.md); grading algorithm ADR to follow.

## Context

To mark an answer correct we compare the user's query result against an **expected output**. Where does that expected output come from? It must stay correct as questions/datasets evolve, and it must not silently drift from the canonical solution. Grading itself is **output equivalence** (separate ADR), not string matching.

## Options considered (≥3)

### A. Compute at runtime from the canonical solution
Ship the canonical solution with the question (it's revealable anyway). At grade time, run the canonical solution against the dataset in the same DuckDB engine, then compare the user's result to it.
- **+** Single source of truth — the canonical solution *is* the spec; expected output can never drift from it. No fixtures to maintain. Same engine/dialect as the user's run, so type/format normalisation is consistent.
- **−** Canonical must execute client-side (fine — DuckDB runs it); a wrong/non-deterministic canonical silently yields a wrong "expected" (mitigated by authoring tests).

### B. Precompute & store expected result sets in content
Author writes the expected table into the content file.
- **+** No runtime cost; expected output viewable without running anything.
- **−** Two sources of truth (stored table + canonical solution) that **drift**; tedious to author and re-generate when a dataset changes; error-prone for large/messy outputs.

### C. Hybrid — compute at runtime, snapshot in tests
Runtime computation is the source of truth (as A), **plus** a build/test step that executes every canonical solution to assert it runs, is deterministic, and (optionally) snapshots its output to catch unintended changes.
- **+** All of A's benefits, with a safety net against broken/changed questions.
- **−** Slightly more test infrastructure.

## Decision

**Adopt C: compute expected output at runtime from the canonical solution (option A), backed by an authoring/validation test (the snapshot safety net).**

- Grading and the "expected output" panel both derive from running the **canonical solution** against the dataset in DuckDB — one source of truth.
- A validation test (ROADMAP Phase 2) runs **every** question's canonical solution to assert it: executes without error, returns a deterministic result under the question's ordering rules, and (snapshot) hasn't changed unexpectedly. This is also where we'd catch a canonical that's accidentally wrong.

## Consequences

- **Positive:** no stored-expected drift; authoring a question = write dataset + task + canonical solution (+ grading flags), nothing else; messy/large expected outputs need no hand-transcription.
- **Negative / to handle:**
  - Non-deterministic canonicals (e.g. unordered results) must be normalised by the grader (row-order-insensitive unless the question requires order) — handing the determinism contract to ADR-grading.
  - Per-dialect: when a question supports multiple dialects (ADR 0002), each dialect's canonical produces its own expected output; all should be output-equivalent — a natural cross-check the validation test can enforce later.
- **Next:** define the **output-equivalence grading algorithm** (column names/order, row order only when required, numeric tolerance, nulls, duplicates, types) as its own ADR.
