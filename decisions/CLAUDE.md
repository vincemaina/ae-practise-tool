# decisions/

Architecture Decision Records (ADRs). One file per meaningful decision, numbered `NNNN-title.md`. Per our working practices, any meaningful design choice should weigh **≥3 options** and record what was compared, what was chosen, and why — so the reasoning isn't lost.

Each record: **Status** (proposed / accepted / superseded) · **Context** · **Options considered (≥3)** · **Decision** · **Consequences**. Mark empirical claims as measured vs inferred.

## Records
- `0001-browser-sql-engine.md` — execution engine. **Accepted: DuckDB-Wasm.**
- `0002-dialect-strategy.md` — multi-dialect approach. **Accepted: single engine + transpile/validate/per-dialect answers, generic-first for MVP.**
- `0003-expected-output-strategy.md` — where expected output comes from. **Accepted: compute at runtime from the canonical solution, backed by an authoring test.**
- `0004-grading-algorithm.md` — output-equivalence comparator. **Accepted: positional columns, multiset rows (order-insensitive unless `orderMatters`), value/type-family normalisation, per-question flags.**
- `0005-tooling.md` — project setup. **Accepted: pnpm + Vite + TS strict + Vitest + Playwright + ESLint/Prettier** (confirmed at scaffold time).

_Phase 0 design decisions complete. Next is Phase 1 (scaffold + walking skeleton) — see ROADMAP._
