# Contributing

Thanks for helping grow this SQL practice tool! The most valuable contribution is
usually **a new question** — and that no longer requires writing any code.

## Add a question (the common case)

Questions are plain **JSON** files in `app/src/content/questions/`. Drop a file in and
it's automatically registered — no central list to edit.

1. **Scaffold it** (from `app/`):
   ```bash
   pnpm new:question my-question-slug
   ```
   This creates `src/content/questions/my-question-slug.json` from a template.

2. **Fill it in.** Your editor will autocomplete and validate against the schema (via the
   `$schema` line). Fields:

   ```jsonc
   {
     "$schema": "../question.schema.json",
     "id": "q-my-question-slug",        // keep the q- prefix
     "slug": "my-question-slug",
     "title": "Revenue per customer",
     "prompt": "For each customer… Columns: name, total. Order by total desc, then name.",
     "difficulty": "easy",              // easy | medium | hard
     "packs": ["Joins & Aggregations"],
     "dialects": ["generic"],           // generic = portable; else snowflake/bigquery/…
     "datasetId": "ecommerce",          // one of src/content/datasets/*.json
     "canonical": {
       "generic": [                      // the reference solution — string OR array of lines
         "SELECT c.name, SUM(o.amount) AS total",
         "FROM customers c JOIN orders o ON o.customer_id = c.customer_id",
         "WHERE o.status = 'completed'",
         "GROUP BY c.name",
         "ORDER BY total DESC, c.name"
       ]
     },
     "grading": { "orderMatters": true },
     "hints": ["Join customers to orders, filter to completed, then SUM per name."]
   }
   ```

   - **Grading is by output equivalence** — your `canonical.generic` is run on the real
     engine and its output *is* the expected answer. Don't worry about formatting; make it
     produce the right rows. Set `"grading": { "orderMatters": true }` when the prompt
     specifies an ordering (and include a deterministic tie-break in the SQL).
   - **Dialect showcase question?** (e.g. "use Snowflake `QUALIFY`") add a
     `canonical.<dialect>` in that dialect **and** a `requires` assertion so a different
     construct can't stand in:
     ```json
     "requires": { "pattern": "qualify", "flags": "i", "message": "Use QUALIFY, not a subquery." }
     ```

3. **Verify it** (from `app/`):
   ```bash
   pnpm verify:content
   ```
   This boots the real DuckDB-Wasm engine, runs your solution against the dataset, and
   confirms it self-grades as correct, is deterministic, and (for extra dialects)
   transpiles + matches. **This same check runs in CI on your PR** — if it's green, your
   question is sound.

That's it — open a PR.

## Add a dataset (advanced)

Datasets are JSON in `app/src/content/datasets/` (`id`, `title`, `tables`, `setupSql`).
`setupSql` must be **idempotent** (`CREATE OR REPLACE …`) and deterministic (no `random()` —
use `generate_series` + formulas so `verify:content`'s determinism check passes). Prefer
adding questions to an existing dataset when you can.

## Dev setup

```bash
cd app
corepack enable && pnpm install    # pnpm (npm install won't work — see app/CLAUDE.md)
pnpm dev                           # http://localhost:5173
```

Before opening a PR, run the full gate from `app/`:

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm verify:content && pnpm build
```

## Conventions

- One question per file; filename = `slug`.
- Keep prompts explicit about **columns and ordering** — grading is exact.
- Architecture, commands, and deeper conventions live in [`app/CLAUDE.md`](./app/CLAUDE.md)
  and the design records in [`decisions/`](./decisions/).
