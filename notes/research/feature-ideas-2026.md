# Feature research & prioritised ideas (2026-06-28)

Agent-driven pass: web research on the SQL-practice landscape + a critical look at our app, → a prioritised backlog. Builds on [`competitor-landscape.md`](./competitor-landscape.md).

## What the market does (and what we're missing)

From 2026 landscape research (DataLemur, StrataScratch, DataCamp, SQL Quest, LeetCode):

- **Explain *why* a query is wrong** — DataLemur gives in-depth solution explanations *with alternatives*; SQL Quest ships a Claude-powered "AI Coach" with row-level wrong-answer diagnosis. **This is the most consistently praised feature.**
- **Structured learning paths / adaptive progression** — ordered tracks (filter→join→subquery→window), increasing difficulty, not isolated problems.
- **Immediate feedback that teaches the logic**, not just correct/incorrect.
- **Progress, streaks, gamification, certificates** for motivation/retention.
- **Real-world, project-style datasets** — *our existing differentiator*; keep leaning in.
- **Interview realism** — AE/DS SQL rounds are 45–60 min, test **window functions, anti-joins, conditional aggregation** (all in our bank), and reward **speed & clarity** ("done in 15 min, no dead ends").
- **Performance at scale** — the junior→senior signal is queries that stay fast as data grows.
- **dbt** — incremental models, tests, debugging compilation errors (a whole sub-market).

## Where we already win
Realistic *messy* AE data (audited so concepts bite), warehouse-grade engine (DuckDB: QUALIFY/window/JSON), output-equivalence grading, derived per-question metadata, a worksheet editor, fully offline/client-side.

## Critical look at our app (gaps I can see headlessly)
- Wrong answers show a **text reasons list** — no **visual diff** of expected vs actual.
- Progress is binary **solved/unsolved** — no "attempted/incorrect" state, so no review or adaptivity is possible yet.
- We compute rich **metadata** but the list only filters by pack/difficulty — concepts aren't surfaced/filterable.
- No **review / bookmark / notes**, no **streak/daily goal**, no **timed/interview mode**.
- Only one challenge type (write-a-query); the brainstorm's **debugging** and **optimization** types are unbuilt.

## Prioritised backlog

Legend: value (★), effort (S/M/L), and whether it needs a backend/LLM.

### Tier 1 — high ROI, client-side, build next
1. **Result diff on incorrect** ★★★ · M · no-backend. Turn "Incorrect" into a learning moment: highlight missing/extra rows, wrong/renamed columns, first differing cell. We already have the comparator — surface it visually. Directly delivers the #1 market feature *without* AI.
2. **Concept filters + learning paths from metadata** ★★★ · S–M · no-backend. Filter the list by "window functions / CTEs / joins / grouping" (metadata exists); add a few curated, ordered **tracks** (e.g. "Window Functions 101→hard", "AE interview sprint"). Leverages work already done.
3. **Richer progress: attempted/solved + review-missed + streak** ★★★ · M · no-backend. Track attempts/incorrects (not just solved); a "Review" view re-surfaces missed questions (spaced-repetition-lite); a daily streak. Unlocks adaptivity later.

### Tier 2 — strong differentiators, more effort
4. **Debugging challenge type** ★★★ · M–L · no-backend. Pre-fill a *broken* query; user fixes it; grade on output. Very AE-interview-relevant, and a clear differentiator vs sql-practice.com. Needs a small content-model extension (`starterSql`, `challengeType`).
5. **Adaptive "next best question"** ★★ · M · no-backend. Use metadata + attempt history to recommend what to solve next (weak-area targeting). Builds on #2/#3.
6. **Timed "interview mode"** ★★ · S · no-backend. Per-question timer + a session of N questions; mirrors the 15-min pressure the research emphasises.

### Tier 3 — bigger bets / architectural
7. **AI explanation / coach** ★★★ · L · **needs LLM**. "Explain why my query is wrong / suggest an approach" via the Claude API. Highest-value market feature, but it reopens the no-backend stance (API key / proxy, cost). Worth a dedicated decision.
8. **dbt practice** ★★ · L. Deferred per scope; large sub-market.
9. **Snowflake/BigQuery dialect layer** ★★ · L. Deprioritised earlier; research reaffirms warehouse-specific practice is valued.

## Recommendation
Start with **Tier 1 (#1 result-diff, then #2 concept-filters/paths, then #3 richer progress)** — each is client-side, high-value, and compounds (3 unlocks 5). Then **#4 debugging** as the headline new challenge type. Treat **#7 AI coach** as a separate, explicit product decision (it's the one that breaks "no backend").

## Sources
- [SQL Practice Sites Compared (2026) — SQL Quest](https://sqlquest.app/sql-practice-comparison/) · [DataLemur vs StrataScratch](https://datalemur.com/blog/datalemur-vs-stratascratch-for-data-science)
- [Where to Practice SQL in 2026 (Analytics Insight)](https://www.analyticsinsight.net/top-list/where-to-practice-sql-in-2026-top-10-learning-platforms) · [How to practice SQL (Rivery)](https://rivery.io/blog/how-to-practice-sql/)
- [Data Engineering Interview Prep 2026 (dev.to)](https://dev.to/hadil/data-engineering-interview-prep-2026-what-actually-matters-sql-pipelines-system-design-478j) · [dbt interview questions (DataCamp)](https://www.datacamp.com/blog/dbt-interview-questions)
