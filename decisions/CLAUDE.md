# decisions/

Architecture Decision Records (ADRs). One file per meaningful decision, numbered `NNNN-title.md`. Per our working practices, any meaningful design choice should weigh **≥3 options** and record what was compared, what was chosen, and why — so the reasoning isn't lost.

Each record: **Status** (proposed / accepted / superseded) · **Context** · **Options considered (≥3)** · **Decision** · **Consequences**. Mark empirical claims as measured vs inferred.

## Records
- `0001-browser-sql-engine.md` — execution engine. **Accepted: DuckDB-Wasm.**
- `0002-dialect-strategy.md` — multi-dialect approach. **Accepted: single engine + transpile/validate/per-dialect answers, generic-first for MVP.**
- `0003-expected-output-strategy.md` — where expected output comes from. **Accepted: compute at runtime from the canonical solution, backed by an authoring test.**
- `0004-grading-algorithm.md` — output-equivalence comparator. **Accepted: positional columns, multiset rows (order-insensitive unless `orderMatters`), value/type-family normalisation, per-question flags.**
- `0005-tooling.md` — project setup. **Accepted: pnpm + Vite + TS strict + Vitest + Playwright + ESLint/Prettier** (confirmed at scaffold time).
- `0006-snowflake-dialect-transpilation.md` — write real Snowflake SQL, transpiled to DuckDB in-browser via polyglot. **Accepted: best-effort transpile + a small conservative post-transpile fixup pass** (`TO_VARCHAR`/`TO_CHAR`→CAST, `STARTSWITH`→`starts_with`); hard edges (`FLATTEN`, format strings, text colon access, `RATIO_TO_REPORT`) deferred.
- `0007-learn-mode-flashcards.md` — a second "Learn" pillar. **Accepted: top-bar Practice|Learn tabs + Leitner spaced repetition; dbt deck first; shared streak.**
- `0008-json-content-authoring.md` — how questions are authored, for open-source contribution. **Accepted: JSON files, auto-discovered + Zod-validated + generated JSON Schema; CI runs `verify:content` as the trust gate.**

_Phase 0 design decisions (0001–0005) complete; 0006/0007/0008 are later feature/authoring follow-ups. See ROADMAP._
