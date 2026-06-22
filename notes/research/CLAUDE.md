# notes/research/

General research for the project (web research pass, 2026-06-22). Background context to inform decisions — not specs or final decisions.

## Files
- `sql-practice-com.md` — how sql-practice.com works (UX, client-side SQLite/sql.js execution — partly inferred), and what to keep vs beat.
- `competitor-landscape.md` — the 2026 SQL-practice platform landscape and the analytics-engineering market gap that is our wedge.
- `browser-sql-engines.md` — DuckDB-Wasm vs sql.js vs PGlite, plus dialect-handling options (sqlglot/polyglot). Background for the upcoming engine decision; early lean = DuckDB-Wasm.

## Open follow-ups
- Confirm sql-practice.com's engine in-browser via DevTools (currently inferred as sql.js).
- Run a real ≥3-way engine bake-off at realistic data scale → write a decision record before scaffolding.
