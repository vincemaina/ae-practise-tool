# Research: sql-practice.com

_Research date: 2026-06-22. Some points are **inferred** (the site is a JS-rendered SPA and I could not directly read its bundled source via a simple fetch). Items marked ⚠️ should be confirmed by opening the site in a browser with DevTools before we rely on them._

## What it is

A free, no-login "online SQL terminal" for practising SQL queries against fixed sample databases. Page title: _"Learn SQL - Online SQL Terminal - Practice SQL Queries"_.

## UX flow (observed / widely reported)

1. Pick a sample database (it ships a simpler "Computer Store"-style DB and the classic **Northwind** business DB — customers, orders, products, categories, employees, suppliers, shippers).
2. Browse a question list tagged by difficulty: **Easy / Medium / Hard**.
3. Each question shows a natural-language task; a **schema/table reference** is visible alongside.
4. Write SQL in an in-page editor → **Run** → results render in a table.
5. Compare against the expected answer / solution.

⚠️ Exact question counts vary by source (one article cited ~13 for a subset; the site overall has more across the three difficulties). Confirm real counts in-browser.

## Execution model — client-side (inferred, high confidence)

- Strong evidence it runs **entirely client-side** with **sql.js** (SQLite compiled to WebAssembly): no backend round-trip per query, instant results, and sql.js is the standard way sites do exactly this.
- Implication: the underlying dialect is **SQLite**, not a warehouse. That's a key limitation we want to beat — SQLite lacks much warehouse-flavoured SQL.
- ⚠️ Verify by checking the Network tab (no XHR on Run) and Sources tab (look for `sql-wasm.wasm` / sql.js) when we get a chance.

## What we can learn / what to beat

**Good patterns worth keeping:**
- Zero-friction: no login, runs in the browser, instant feedback — matches our MVP goal.
- Schema-visible-while-you-write is good UX.
- Simple difficulty tagging.

**Gaps = our differentiation opportunity:**
- Only generic/SQLite SQL — no Snowflake/BigQuery dialect realism.
- Toy/clean data (Northwind), not messy analytics-engineering data (dupes, late events, JSON, fanout, timezones).
- Limited "advanced" coverage — the user's specific complaint and the reason for this project.
- No packs/practice-paths tailored to analytics engineering; no window-function/funnel/cohort/attribution focus; no dbt.

## Constraint reminder (from the brainstorm)

Do **not** copy their questions, datasets, branding, UI, or proprietary content. We study mechanics and UX patterns only.

## Sources
- [sql-practice.com](https://www.sql-practice.com/)
- [sql.js (SQLite → WASM)](https://sql.js.org/) · [GitHub](https://github.com/sql-js/sql.js/)
- [A detailed look at basic sql.js features — LogRocket](https://blog.logrocket.com/detailed-look-basic-sqljs-features/)
- [SQL Practice: Northwind Database — Medium](https://medium.com/@tasnimxpress/sql-practice-northwind-database-d5296041a342)
