# Research: Competitor landscape & market gap

_Research date: 2026-06-22._

## The main players (2026)

| Platform | Target | Model | Notes |
|---|---|---|---|
| **sql-practice.com** | Beginners, quick practice | Free | SQLite client-side, Northwind, easy→hard. The user's current tool; "advanced side limited." See [sql-practice-com.md](./sql-practice-com.md). |
| **DataLemur** | FAANG interview prep | Free ~30-50 Q + ~$10-29/mo | Real interview Qs (Meta/Google/Amazon), solution videos. Clean, interview-shaped problems. |
| **StrataScratch** | Data scientists (SQL + Python) | Free ~50 Q + ~$39/mo | Largest bank (500-700+), real company Qs, aggressive paywall. |
| **LeetCode SQL** | SWEs doing algo + SQL | Free ~50-80 Q + premium | SQL secondary to algorithms. |
| **HackerRank SQL** | Early-career / employer screening | Free + certs | Industry screening tool, free credentials. |
| **SQL Quest** | Beginners, diagnostic learning | Free 200+ Q + paid | AI Coach (Claude) giving row-level error diagnosis. |

## The market gap (our wedge)

Across all of these, **analytics-engineering-specific SQL practice is essentially unserved**. They optimise for data-science interview prep or general coding screens, using **clean, toy datasets**. None focus on:

- **Realistic messy warehouse data** — duplicate/late events, nulls, bad types, semi-structured JSON, many-to-many fanout, multiple grains, timezone/ingestion-vs-event-time issues.
- **Dialect/warehouse realism** — Snowflake / BigQuery-specific syntax and correctness.
- **Analytics-engineering problem shapes** — funnels, retention, cohorts, attribution, sessionisation.
- **dbt-style modelling practice** (later).

This matches the brainstorm's positioning: not "SQL for beginners," but the best SQL practice platform for **analytics engineers** — realistic, warehouse-style, messy-data, dialect-aware, eventually dbt.

## Implications for us

- Differentiation is **content + realism**, not just another question bank. The engine/dialect choice must support analytics SQL (window functions, `QUALIFY`, semi-structured) — see [browser-sql-engines.md](./browser-sql-engines.md).
- A genuinely hard, advanced tier is the explicit demand; don't stop at intermediate.
- One competitor (SQL Quest) already uses an AI coach — useful signal for our (deferred) AI-explanation feature, not an MVP need.

## Sources
- [SQL Practice Sites Compared (2026) — SQL Quest](https://sqlquest.app/sql-practice-comparison/)
- [DataLemur vs StrataScratch](https://datalemur.com/blog/datalemur-vs-stratascratch-for-data-science)
- [Top 10 Data Engineering Interview Prep Tools (2026) — dev.to](https://dev.to/hadil/top-10-data-engineering-interview-prep-tools-2026-guide-for-sql-etl-system-design-1eli)
