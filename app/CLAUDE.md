# app/

The React + Vite + TypeScript PWA — the SQL practice tool itself. Phase 1 "walking skeleton": one hardcoded question proven end-to-end (run → grade → reveal). See repo `ROADMAP.md` and `decisions/`.

## Setup
Uses **pnpm** (pinned via `packageManager`). Enable it with Node's corepack: `corepack enable && pnpm install`. **`npm install` fails** — `apache-arrow` (transitive via duckdb-wasm) ships a broken `bin` entry that crashes npm but only warns under pnpm.

## PWA / offline
`vite-plugin-pwa` (config in `vite.config.ts`) generates a service worker + `manifest.webmanifest` on `pnpm build`. App shell is precached; the large DuckDB `.wasm` is **runtime-cached** (CacheFirst, `duckdb-wasm` cache) rather than precached, so install stays light and the app works offline after one real load. Icon is `public/icon.svg` (PNG 192/512 are a TODO for install prompts). For a subpath deploy, set Vite `base`. SW only active in `build`/`preview`, not `dev`.

## Dev feedback loop (closed-loop, dev-only)
While the user runs `pnpm dev` on their machine, the app logs feedback + telemetry to a SQLite DB on the shared file mount; the agent reads and acts on it from the container.
- **Write side:** `vite/dev-feedback.ts` — a Vite `apply:'serve'` plugin exposing `POST /__dev/feedback` and `/__dev/events`, writing to `<repo>/.dev-data/feedback.sqlite` (override via `FEEDBACK_DB`). Uses better-sqlite3, lazy-imported + guarded (disables gracefully if the binding is missing).
- **App side (dev only, `import.meta.env.DEV`):** `src/dev/telemetry.ts` (`logEvent`/`sendFeedback` + global error & click capture) and `src/dev/FeedbackWidget.tsx` (corner 💬 button → one submission bundles an optional 👍/👎 with a note, sent only on Submit, auto-tagged with the current question). It also captures a **DOM→PNG screenshot** of the app (via `html-to-image`, excluding the widget) so the agent can see the exact visual state. Logged events: session_start, nav, question_view, run, submit, reveal, click, error.
- **Agent side (container):** `python3 scripts/dev-feedback.py` — `list` (open feedback, prints the 📷 screenshot path), `events`, `errors`, `stats`, `done <id> [note]` (mark addressed). **Check `list` at the start of a session and after the user has been testing; `Read` the screenshot PNG to see their screen; mark items `done` once fixed so they don't resurface.** Screenshots live at `.dev-data/screenshots/feedback-<id>.png`.
- Not in the production build (serve-only plugin; telemetry no-ops when not DEV). `.dev-data/` is gitignored.

## Visual verification (let the agent "see" the app)
`pnpm screenshot` runs `tests/e2e/screenshots.spec.ts`, capturing key states (light, dark, correct verdict, error squiggle) to `app/screenshots/*.png` (gitignored). Those PNGs can be opened/read to review the UI — the agent's stand-in for eyes.

**Needs a Playwright browser**, which must be provided by the environment (Chromium can't be installed without root):
- **In the dev container (preferred):** bake it into the image, as root at build time —
  `ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright` then `RUN npx -y playwright@1.61.0 install --with-deps chromium && chmod -R 777 /ms-playwright`. Or base the image on `mcr.microsoft.com/playwright:v1.61.0-noble`.
- **On the host (stopgap):** since the repo dir is shared, run `pnpm exec playwright install chromium && pnpm screenshot` on the host; PNGs land in `app/screenshots/` for review.

## Commands (run from `app/`)
- `pnpm dev` — dev server (http://localhost:5173)
- `pnpm build` — typecheck (`tsc --noEmit`) + `vite build`
- `pnpm typecheck` · `pnpm lint` · `pnpm test` (Vitest)
- `pnpm verify:content` — boots the real DuckDB-Wasm engine in Node and grades every question's canonical solution against its dataset (our ADR 0003 authoring check; also our headless stand-in for e2e). Also checks derived metadata isn't stale.
- `pnpm meta:generate` — regenerate `src/content/question-metadata.generated.ts` after changing any canonical solution.
- `pnpm coverage` — regenerate root `COVERAGE.md`: a live SQL-feature checklist with per-feature question counts, derived from canonical SQL. Feature catalog + detectors in `src/content/features.ts`; `snowflake-vs-duckdb.md` explains the dialect strategy. A question can carry `features: [...]` to tag concepts the detector can't infer (e.g. self-joins).
- `pnpm e2e` — Playwright run→grade loop in a real browser. **Needs browser system libs:** `pnpm exec playwright install --with-deps chromium` (requires root; not available in the minimal CI sandbox — `verify:content` covers the engine+grading path there).
- **Definition of done:** typecheck + lint + test + verify:content green, and (where a browser is available) the Playwright loop passes with no console errors (ADR 0005).

## Layout
- `src/grading/` — **core IP.** `grade.ts` is the pure output-equivalence comparator (ADR 0004) **and `diffResults`** (structured diff — missing/extra rows, column mismatch, order-only failure — powering the incorrect-answer view); `grade.test.ts` its unit tests; `types.ts` the `ResultSet`/`Cell` shapes.
- `src/engine/` — `duckdb.ts` boots DuckDB-Wasm (lazy, `eh` build) in a worker; all connection access is **serialized** through one queue. `runQuery(sql, dialect)` / `validateSql(sql, dialect)` first **transpile** the user's SQL from their dialect to DuckDB via `transpile.ts` (`toDuckDB`, lazy-loaded polyglot wasm — ADR 0006; `generic`/`all` pass through). `ensureDataset()` seeds. `result-mapping.ts` is the pure Arrow→`ResultSet` mapper reused by the Node verification script.
- `src/content/` — typed content model. `types.ts` (Question/Dataset), `datasets/`, `questions/` (one file each), `paths.ts` (curated learning tracks → ordered question ids), `index.ts` registry + `allPacks`/`difficulties`/`allConcepts`/`questionConcepts`/`getMetrics`/`paths`. Concepts (Joins/CTEs/Window…) are derived from each question's metrics (`conceptsOf`). Expected output is **computed at runtime** from each question's canonical solution (ADR 0003) — not stored.
  - `dialects.ts` — a question's `dialects` tag = which SQL dialects it's *appropriate for* (`'generic'` = portable → shown for every dialect; else restricted, e.g. QUALIFY → snowflake/bigquery). `matchesDialect` + `DIALECT_OPTIONS` drive the **dialect picker** on the problem list (persisted in localStorage; filters the list, nav, recommend, and progress totals). This is a **product filter only** — execution/grading always uses the single `canonical.generic` reference (true per-dialect syntax fidelity is the still-deferred ADR-0002 transpile layer).
  - `metrics.ts` — `extractMetrics` derives structural metadata (tables, joins, window functions, CTEs, aggregates, subqueries, groupBy/orderBy/distinct) from a canonical's parse tree (DuckDB `json_serialize_sql`); pure + unit-tested. `pnpm meta:generate` writes `question-metadata.generated.ts` (committed); `verify:content` fails if it's stale. Don't hand-edit metrics or the generated file — regenerate.
- `src/storage/progress.ts` — localStorage progress: per-question attempts/solved, "needs review" set (attempted-but-unsolved), and a daily streak. Injectable Storage + clock for tests; migrates the old solved-array format.
- `src/route/useRoute.ts` — tiny hash router (no dep): `#/` = list, `#/q/<slug>` = solve. `navigate()` updates state synchronously (so it's testable) + sets the hash.
- `src/components/` — **two screens**: `ProblemList` (browse table) and `SolveView` (wraps `PracticeView`). Shared `TopBar` (logo + contextual back/prev/next/shuffle nav, circular `ProgressRing` w/ hover tooltip, `ProfileMenu`). `ProfileMenu` houses the theme toggle + a **local-only** sign-in (display name in localStorage — no auth backend) so `Avatar` shows real initials. `PracticeView` is the **worksheet**: left = problem + `SchemaPreview` (scrolls); right = full-height `SqlEditor` with a **sliding output drawer** (`Run`/`Submit`/`Reveal` results, collapsible). Plus `SqlEditor`, `SqlBlock`, `ResultsTable`, `DifficultyBadge`, `formatCell`, `Avatar`.
- `src/editor/` — `sqlDialect.ts` (shared DuckDB CodeMirror dialect), `statement.ts` (`statementForCursor` — **line-based** selection: the cursor's line picks the query; an empty line picks the previous query — built on char-based `statementAt`; plus `statementCount`), `activeStatement.ts` (highlights the selected statement when the worksheet has >1 query). `⌘/Ctrl+Enter`, Run, the highlight, and inline validation all use `statementForCursor`.
- `src/theme/useTheme.ts` — light/dark theme hook (persisted, defaults to OS); sets `<html data-theme>`.
- `src/App.tsx` — routes between `ProblemList` and `SolveView` under a shared `TopBar`. `src/App.test.tsx` is a jsdom test of the list→solve→back flow + filters/search/theme (engine mocked).
- `src/styles.css` — **semantic design tokens** (`--bg`/`--surface`/`--accent`/…) defined once for light + `[data-theme='dark']`. Style with tokens, not hardcoded colors, so both themes stay correct (see `notes/research/premium-ux.md`).
- `scripts/verify-content.ts` — `pnpm verify:content`; the authoring validation gate (ADR 0003).
- `tests/e2e/` — Playwright; drives the real app incl. DuckDB-Wasm in-browser.

## Conventions / gotchas
- The SQL editor is CodeMirror (`SqlEditor`). It renders a contenteditable, so e2e types into `.cm-content` (not a `<textarea>`); the `data-testid="editor"` is on the wrapper.
- DuckDB-Wasm is excluded from Vite dep pre-bundling (`vite.config.ts`); workers/wasm are imported via `?url`.
- Grading is **value-based** — column names ignored unless `requireColumnNames`, rows order-insensitive unless `orderMatters`. Don't "fix" a failing question by string-matching SQL.
- To add a question: add a dataset (idempotent `CREATE OR REPLACE` setup SQL) + a `Question` with a runnable canonical solution, and register both in `content/index.ts`.
