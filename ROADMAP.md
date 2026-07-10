# ROADMAP

High-level plan for the analytics-engineering SQL practice tool. This is the map; detailed plans/decisions live in [`decisions/`](./decisions/) and research in [`notes/research/`](./notes/research/). Keep this updated as phases ship.

Product context: see [`notes/chatgpt/brainstorm.md`](./notes/chatgpt/brainstorm.md) (intent) and [`CLAUDE.md`](./CLAUDE.md) (working agreement + practices).

**Status legend:** ⬜ not started · 🔄 in progress · ✅ done

---

## Phase 0 — Foundations & key decisions
_Goal: settle the interlocking keystone decisions before writing app code._
- ✅ General research pass (sql-practice.com, competitors, engines) — see `notes/research/`
- ✅ Engine bake-off → decision record — **DuckDB-Wasm** (ADR 0001)
- ✅ Dialect strategy — single engine + transpile/validate/per-dialect answers, generic-first (ADR 0002)
- ✅ Expected-output strategy — compute at runtime from canonical solution (ADR 0003)
- ✅ Output-equivalence grading algorithm — design + decision record (ADR 0004)
- ✅ Tooling decisions — pnpm, Vitest, Playwright, ESLint/Prettier, TS strict (ADR 0005)

**Phase 0 complete.** Ready to start building (Phase 1) on user's go-ahead.

## Phase 1 — Walking skeleton (one question, end-to-end)
_Goal: prove the core loop with a single hardcoded question._
- ✅ Scaffold `app/` (Vite + React + TS + pnpm) around DuckDB-Wasm
- ✅ Engine boots (lazy, `eh` build, worker); runs queries; renders a results table
- ✅ Seed one realistic dataset (e-commerce orders, with non-completed orders)
- ✅ Run → Submit → grade (output equivalence) → correct/incorrect
- ✅ Reveal expected output + canonical solution (computed at runtime, ADR 0003)
- ✅ Vitest grading tests (13); `verify:content` runs the real engine over every question
- 🔶 Playwright e2e written; can't run in this sandbox (no browser system libs / no root). Covered by `verify:content` here; run `pnpm e2e` on a dev machine.

_Phase 1 verified green: typecheck + lint + 13 unit tests + content verification (real DuckDB-Wasm) + production build all pass. Found & fixed a DECIMAL-scaling bug during verification (decimals were unscaled strings)._

## Phase 2 — Content model & authoring ✅
_Goal: questions become structured, easy-to-add data, not hardcode._
- ✅ Typed Question/Dataset content schema (`content/types.ts`), one file per question
- ✅ Shared, file-seeded datasets (5) **audited so each question's concept actually bites** — duplicate purchases (so `DISTINCT` matters), a purchaser who never signed up (funnel filter), varied per-channel conversion rates, refunds/cancellations, `NULL` cancel dates, a JSON dataset, etc.
- ✅ **All datasets scaled to ~1000 rows (deterministic generation)** — every dataset is a hybrid seed: hand-placed "special" rows guarantee the concept-bite cases, a generated bulk (`generate_series` + formulas, **no random**) adds realistic volume. Now: ecommerce 1009 orders/1507 items, events 1012, subscriptions 1006, sessions 1009, api_logs 1005. Formulas decorrelated so distributions stay realistic (all plans active, conversion varies by channel, all currencies present). Scale-sensitive questions fixed with deterministic tie-breaks; `verify:content`'s determinism + self-grade checks pass at scale.
- ✅ Authoring validation (`pnpm verify:content`) runs every question on the real engine: canonical executes, deterministic, self-grades Correct, returns rows, lists generic dialect
- ✅ **Derived question metadata** — structural metrics (tables, joins, window functions, CTEs, aggregates, subqueries, groupBy/orderBy/distinct) auto-extracted from each canonical's DuckDB parse tree (`metrics.ts` → generated file, drift-checked by `verify:content`). Shown as chips on the problem; basis for future concept-based selection/adaptive practice.
- ✅ **Advanced SQL batch (17 questions)** — all join types (left/right/full/cross/self/semi), ROLLUP/CUBE/GROUPING SETS, PIVOT, set ops (UNION/EXCEPT/INTERSECT), NTILE/FIRST_VALUE/LAST_VALUE/explicit frames, LIKE. All identical-syntax in Snowflake & DuckDB (per [`snowflake-vs-duckdb.md`](./notes/research/snowflake-vs-duckdb.md)). Feature coverage 21→**39/51** (`pnpm coverage` → `COVERAGE.md`). Remaining gaps = the Snowflake-name-different tier (regex/lambda/flatten) awaiting the ADR-0002 dialect layer, plus a few DuckDB-native quick wins (GROUPING(), recursive CTE, EXTRACT, string funcs).
- ✅ **General-SQL quick wins (4 questions + `org` hierarchy dataset)** — recursive CTE (org headcount by level), `GROUPING()` (labelled ROLLUP total), `EXTRACT` (orders by month), string funcs (`UPPER`/`LENGTH`). All ANSI/cross-dialect. Feature coverage now **43/51** — every remaining gap is a deliberately-deferred dialect-specific feature (Snowflake-name regex/lambda/flatten, dialect-divergent interval arithmetic).
- ✅ Question bank: **58 questions** across 14 packs, **6 datasets** (Core SQL, Joins & Aggregations, CTEs & Subqueries, Window Functions incl. `QUALIFY`, Messy Data, Funnels & Retention, Cohorts, Attribution, **Sessionisation**, **Semi-Structured Data**), easy→hard incl. multi-step (sessionisation via LAG+gap, MoM growth, two-CTE time-to-purchase, JSON extraction, conditional aggregation/FILTER), over **5 datasets** (ecommerce, events, subscriptions, marketing, api_logs/JSON). All validated on the real engine via `verify:content`.

## Phase 3 — Practice UX (mostly done)
_Goal: a usable tool, not just one question._

> **Direction (2026-06-23):** focus on UX + content now (richer problem/schema presentation, more questions). **Dialect layer deprioritised.** PWA + deploy is the likely next milestone; adaptive-practice + embeddings remain in the idea backlog.
- ✅ **Separate problem-list page** (browse table: status · title · dataset · difficulty, with search + filters) and **solve screen** (problem | editor/results, with back + prev/next/shuffle), via a tiny hash router. Informed by LeetCode / SQL-Practice references in `notes/design-references/`.
- ✅ **Dialect picker** — persisted dropdown on the problem list; each question's `dialects` tag marks which SQL dialects it suits (`generic` = portable/all; QUALIFY/PIVOT questions restricted to warehouse dialects). Filters the list, prev/next/shuffle, recommend, and progress totals. Product filter only — grading still runs the portable `canonical.generic` (per-dialect syntax fidelity remains the deferred ADR-0002 work).
- ✅ **Concept filters + learning tracks** — filter the list by metadata-derived concepts (Joins/CTEs/Window/Grouping…); curated ordered tracks (`paths.ts`: Foundations, Joins & Aggregation, Window Functions, CTEs & Subqueries, AE interview sprint) shown as cards with per-track progress.
- ✅ Question view: schema preview, Run, results, Submit, Reveal, progressive hints
- ✅ **CodeMirror SQL editor**: syntax highlighting, schema-aware autocomplete, inline error squiggles (parser + real DuckDB `EXPLAIN`). **Worksheet mode**: full-height editor, multiple queries, `⌘/Ctrl+Enter` (or Run) executes the **statement at the cursor** (highlighted when >1 query), results in a **sliding/collapsible output drawer**.
- ✅ App shell: logo + contextual nav in the bar, circular progress ring (hover tooltip), profile menu (theme toggle + local display-name sign-in → avatar initials).
- ✅ **Result diff on incorrect** — when a submission is wrong, the output drawer shows *what* differs: missing rows (expected, not in yours), extra rows, column mismatch, or "right rows, wrong order" (reuses the grading comparator; `DiffView` + `diffResults`). No AI needed.
- ✅ **Richer progress + review + streak** — tracks attempts/solved (not just solved), a **"Needs review"** shortcut (attempted-but-unsolved) with a ↻ status mark, and a **daily streak** chip (🔥) in the top bar. Store rewritten (`progress.ts`, migrates the old format) + unit-tested with an injectable clock.
- ✅ **Tier 2:** **Debugging challenge type** (4 questions: fix-the-broken-query; `challengeType`/`starterSql`, editor pre-fill, 🐞 badge, `verify:content` proves each starter is wrong) · **Adaptive next-question** (`recommendNext` — finish review first, else weakest-concept easiest-unsolved; banner on the list + "Next recommended →" on solve) · **Per-question timer** (ticking, amber/red thresholds, freezes on solve).
- ✅ **Premium UX pass** — semantic design tokens, light/dark theme (persisted), app shell (top bar + progress + sidebar + split workspace), difficulty badges, redesigned feedback banner + confetti on solve (reduced-motion aware), engine loading state, polished results table, theme-synced editor. Research in `notes/research/premium-ux.md`. jsdom render test added.
- ✅ Dialect filter — shipped; the Snowflake dialect is live (write Snowflake SQL, transpiled to DuckDB; ADR 0006). See the "Later" section for depth.
- ✅ **Session config** — "Start a session": a config panel (`SessionSetup`) to build a disposable, focused run of questions by pack/concept/difficulty, pool (unsolved / all / needs-review, with an include-solved top-up), length (5/10/15/all) and order (easy→hard / shuffle). Runs as a queue with a "Session · n/N" counter in the top bar (prev/next walk the queue, back exits); persisted so a reload resumes. Queue logic is pure + unit-tested (`src/session/session.ts`). First cut is intentionally minimal — no end-of-session summary/timer yet (easy follow-up).

## Phase 4 — PWA / offline & deploy
_Goal: installable, offline-capable, hosted._
- ✅ Service worker + manifest via `vite-plugin-pwa` (autoUpdate). App shell precached; DuckDB `.wasm` runtime-cached (CacheFirst) so it works offline after first real load.
- ✅ Web manifest (name/theme/icons), installable. SVG icon shipped; **PNG 192/512 icons are a follow-up** for store-grade install prompts.
- ⬜ Verify offline + install in a real browser (needs the browser-in-container or host run). Now testable against the live URL.
- ✅ **Deployed to Cloudflare (Workers static assets) — LIVE at https://ae-practise-tool.vchapandrews.workers.dev** (2026-07-10). Root-domain deploy (no Vite `base` needed; hash router needs no SPA rewrite). Key gotcha hit + fixed: DuckDB's wasm (33–38 MB) exceeds Cloudflare's 25 MiB per-asset cap, so the engine now loads from jsDelivr (ADR 0001 update); only the app shell + polyglot wasm are self-hosted.

## Later (explicitly deferred — do not build without agreement)
- ✅ **Snowflake dialect (first cut, ADR 0006)** — write real Snowflake SQL, transpiled to DuckDB in-browser via polyglot (lazy ~4 MB wasm, only when a non-generic dialect is active). Threaded through the solve view; a dialect chip shows what you're writing; transpile errors surface distinctly. **12 Snowflake questions** (IFF, NVL/NVL2, DATEADD/DATEDIFF, LISTAGG, QUALIFY, MEDIAN, REGEXP_SUBSTR, TOP n, TO_VARCHAR, STARTSWITH, numeric colon-JSON), each with a `canonical.snowflake` that `verify:content` transpiles + matches. A small conservative **post-transpile fixup pass** (`fixupDuckDbSql`) rewrites the few constructs polyglot leaves verbatim: `TO_VARCHAR`/`TO_CHAR`→CAST, `STARTSWITH`→`starts_with`. Still-deferred hard edges (`LATERAL FLATTEN`, `TO_VARCHAR(x, fmt)` date formatting, **text** colon `:field::string` quote-stripping, `RATIO_TO_REPORT`) surface as normal transpile/run errors — see ADR 0006's 2026-07-10 update.
- BigQuery + other dialects (mechanism is general — polyglot supports 30+; just needs content + tags)
- More advanced/hard questions at depth; sessionisation & semi-structured (JSON) packs; grow the bank
- dbt-style modelling challenges (ref/source/config/incremental/tests)
- AI explanation mode · auth · payments · marketing/SEO site (`web`/`site` folder)

### Idea backlog (captured, not scheduled)
- **Learning mode, not just practice (flashcards)** — add a study/learn section alongside the practice tool: spaced-repetition **flashcards** for concepts/commands/features. First target: **dbt** (commands, concepts, features — e.g. `ref()`/`source()`, materializations, tests, incremental models). Would generalise to SQL-concept flashcards too. Pairs with the existing progress/streak system. A distinct "mode" from the solve loop; consider a top-level Practice vs Learn split.
- **Prioritised feature ideas from a research pass** → [`notes/research/feature-ideas-2026.md`](./notes/research/feature-ideas-2026.md) (result-diff on incorrect, concept filters & learning paths, richer progress/review, debugging challenge type, AI coach, …).
- **SQL feature coverage tracker** → `pnpm coverage` writes [`COVERAGE.md`](./COVERAGE.md) (live per-feature question counts; 21/51 covered). Catalog in `app/src/content/features.ts`.
- **Advanced / Snowflake content** → research + decision in [`notes/research/snowflake-vs-duckdb.md`](./notes/research/snowflake-vs-duckdb.md). Recommended phased approach: build identical-syntax advanced questions now (joins, ROLLUP/CUBE/GROUPING SETS, PIVOT, set ops, window frames), defer true Snowflake-dialect fidelity (regex/lambda/JSON-path spelling) to an ADR-0002 transpile layer.
- **Question embeddings + labels** — give each question an embedding (from its concepts / SQL features / prompt) plus structured labels, so we can measure question-to-question similarity. Uses: dedupe near-identical questions, surface "related questions", auto-cluster/curate packs, and ensure a session has good variety. Pairs well with the existing `packs`/concept tags in the content model.
- **Adaptive practice (premium)** — analyse a user's solved/attempted/incorrect history to estimate strengths & weaknesses per concept/pack, then recommend the next-best question (target weak areas, vary difficulty, space repetition). Builds on the embeddings/labels above + the localStorage progress store (which would likely graduate to richer per-attempt history). A natural paid-tier differentiator.
- ✅ **Required-construct grading for showcase questions (shipped 2026-07-10).** Output-equivalence grading (ADR 0004) can't tell apart two queries that return the same rows — so a "use function X" question can be solved the wrong way. Found in testing: `sf-generic-customers` asks for Snowflake `STARTSWITH` but `LIKE 'Customer%'` passes. Fix (decided: **hard fail**): an **optional, opt-in per-question `requires` assertion layered on top of** output-equivalence — e.g. `requires: { pattern: /startswith/i, hint: '…' }`. On Submit, check the pattern against the **user's typed SQL (pre-transpile**, so `STARTSWITH` is what's matched on a Snowflake question); if the rows match but the construct is absent, mark **Incorrect** with the hint ("your rows are right, but this question is about STARTSWITH — solve it with that, not LIKE"). Scope to the dialect/function-showcase set only (the `sf-*` questions + the `LIKE` one); everything else keeps pure output-equivalence untouched. `verify:content` must assert each such question's own canonical satisfies its own `requires`. Record as a scoped exception on ADR 0004. Touches: `grading/` (or a thin check beside it), `content/types.ts`, `PracticeView` submit path, `verify-content.ts`.
- **Editor UX polish (from testing 2026-07-10, not scheduled)** — two SQL-worksheet editor issues to fix together later:
  - **Active-statement highlight should be a modifier-held run preview.** Today `src/editor/activeStatement.ts` shows the purple `cm-active-statement` line highlight whenever the worksheet has >1 statement and follows the cursor constantly. Desired: only show it **while Ctrl or Cmd is held down** — i.e. a live preview of exactly which statement `⌘/Ctrl+Enter` would run — and have it **visually override** the grey current-line/selection highlight while held. Implementation sketch: track modifier state via keydown/keyup listeners (also clear on blur/`visibilitychange` so a released-off-window key doesn't stick), recompute decorations on modifier change, and give `.cm-active-statement` higher precedence than the active-line/selection layer.
  - **Multiline select + drag doesn't work.** Selecting several lines and dragging the selection (to move/reorder text) doesn't behave in the CodeMirror editor. Needs repro + root-cause (CodeMirror drag config / our decorations possibly intercepting the drag). Purely interactive → needs the user to confirm any fix in-browser.
- **More realistic mock data (faker)** — swap the synthetic placeholders (`Customer 8`, `Product 12`) for lifelike values via a Faker-style library (e.g. `@faker-js/faker`): real person/company names, product names, emails, countries, addresses. Makes datasets read like real analytics tables (better UX + more representative practice). Constraints to respect: keep generation **deterministic** (seed Faker — no `random()`) so `verify:content`'s determinism/self-grade checks still pass; run it at **authoring/build time** to bake fixed values into each dataset's `setupSql` (don't pull Faker into the runtime/PWA bundle); preserve the hand-placed "special" concept-bite rows and any string patterns questions rely on (e.g. the `Customer %` prefix that `sf-generic-customers`/`sf-customer-number` match, JSON payload shapes). Likely a small generator script under `app/scripts/` that emits dataset seed SQL.
