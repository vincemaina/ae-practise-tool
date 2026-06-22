I want you to help me build a browser-based SQL practice platform for analytics engineers.

Important context before we begin:
This prompt is not a final product spec. It is a context dump from a brainstorming conversation I had with ChatGPT. I have not reviewed every architectural decision or feature proposal in detail, so do not treat anything here as final. The purpose of this prompt is to show you where my head is at, what features I’m considering, and what kind of product I want to explore.

Before making major architectural or product decisions, discuss them with me. Challenge assumptions where needed. Suggest better approaches if you see them. The goal is to collaborate on the design, not blindly implement everything in this document.

Product idea:
I currently use sql-practice.com for SQL practice, but I find the advanced side limited and not especially tailored to analytics engineering interviews. I want to build my own version with broader coverage, harder questions, dialect-specific SQL, realistic messy datasets, and eventually dbt-style practice.

This is both:

1. A personal interview-prep tool for me.
2. A potential public product that could later be monetised through ads, SEO, and maybe a paid tier.

Initial direction:
Start by building the actual tool first, not the marketing/SEO site.

The first version should probably be a simple React app, ideally using Vite and TypeScript. I like building tools as PWAs, so the app should be offline-ready where practical and should use service workers. The first version should not require sign-in, a backend, or server requests. The goal is for everything to run in the client.

Likely initial repo structure:

* A single repo to begin with.
* An `app` folder for the React/PWA SQL practice tool.
* Later, possibly a `web`, `www`, or `site` folder for marketing/SEO content.
* The marketing/SEO site could eventually be built with Astro, static HTML, or another simple content-focused setup.
* Do not build the SEO/content site first unless we explicitly agree to do that.

Core app idea:
Build a browser-based SQL practice tool where users can:

* choose a SQL dialect/warehouse
* choose question packs
* write SQL in an editor
* run the query locally in the browser
* submit the answer
* get marked correct or incorrect based on output
* optionally view the expected output and canonical solution

Initial dialects/warehouses:

* Generic SQL
* Snowflake
* BigQuery

Avoid calling these “modes” in the UI where possible. Prefer language like:

* dialect
* warehouse
* SQL engine
* question pack
* practice path
* challenge type

Dialect-specific correctness:
The selected dialect/warehouse should affect correctness. For example:

* If a user selects Snowflake, Snowflake-specific syntax like `QUALIFY` may be accepted where appropriate.
* If a user selects a dialect where a given syntax is not valid, that should be treated as incorrect or invalid.
* Canonical solutions may differ by dialect.
* The same problem may have different solutions for Snowflake, BigQuery, and generic SQL.

This may be technically tricky because the app is not actually executing code against Snowflake or BigQuery. We need to simulate the experience pragmatically. Please research and propose options before implementing. Possible approaches might include:

* DuckDB-Wasm as the browser execution engine
* dialect-specific question constraints
* static validation for unsupported syntax
* query transpilation where realistic
* expected-output grading
* dialect-specific canonical answers
* limiting early questions to syntax that can be executed locally

Do not assume the first architecture you suggest is final. Explain the trade-offs and ask me before committing to major decisions.

Research task:
Before building, do a short research pass:

* Visit sql-practice.com and inspect how the site appears to work.
* Use DevTools/network/source inspection if available.
* Try to infer whether it executes SQL client-side, server-side, or via an API.
* Do not copy their questions, datasets, branding, UI, or proprietary content.
* The goal is only to understand product mechanics and UX patterns.
* Research browser-based SQL execution options, especially DuckDB-Wasm, sql.js, and PGlite.
* Recommend what to use for this project and why.

Execution/grading:
The user should write SQL, press Run, and see results.
When they submit, the app should mark the answer correct or incorrect by comparing the user query output against the expected output.

Do not rely on exact SQL string matching.

Use output equivalence as the main grading strategy, considering:

* column names
* column order where relevant
* row order only when the question requires ordering
* numeric tolerance if needed
* null handling
* duplicate rows
* type differences
* deterministic vs non-deterministic queries

First-version UX:
Keep the app simple and practical:

* question list
* pack/difficulty/dialect filters
* question page or challenge view
* schema/data preview
* SQL editor
* run button
* results table
* submit button
* correct/incorrect result
* expected output
* canonical solution reveal

Do not build AI explanation mode yet.
Do not build authentication yet.
Do not build payments yet.
Do not build a full dbt IDE yet.

Question difficulty:
The tool should eventually go from absolute beginner to extremely advanced.
The hardest questions should be as hard as analytics engineering SQL can realistically get, including multi-step problems that require careful reasoning.

Initial question style:
Start with SQL question mode:

* User sees schema/data context.
* User sees a natural language task.
* User writes one SQL query.
* App runs the query.
* App checks output.
* App shows correct/incorrect, expected output, and a canonical solution.

Future question styles can include:

* debugging broken SQL
* performance optimisation
* messy data cleaning
* warehouse-specific syntax
* dbt model writing
* multi-file analytics engineering mini-projects

Question packs:
Design the content model around packs. Possible packs include:

* Core SQL Foundations
* Joins & Aggregations
* Advanced SQL
* Window Functions
* CTEs & Subqueries
* Analytics Engineering SQL
* Funnels & Retention
* Cohorts
* Attribution
* Sessionisation
* Messy Data
* Semi-Structured Data
* Snowflake Essentials
* BigQuery Essentials
* Debugging SQL
* Performance & Query Optimisation
* dbt Foundations, later
* dbt Incremental Models, later
* dbt Testing & Contracts, later

Users should eventually be able to configure practice sessions by selecting:

* dialect/warehouse
* difficulty range
* packs
* challenge type
* random vs ordered
* maybe timed vs untimed later

Datasets:
Use realistic analytics engineering datasets rather than only toy tables.

Datasets should include realistic problems such as:

* duplicate events
* late-arriving events
* nulls
* incorrect types
* semi-structured JSON payloads
* many-to-many joins
* fanout bugs
* changing user attributes
* refunds/cancellations
* multiple grains
* timezone issues
* event timestamps vs ingestion timestamps
* messy e-commerce/product analytics data
* SaaS subscription data
* marketing attribution data
* app/product event data

Question metadata:
Design a JSON or TypeScript content schema for questions. It should support:

* id
* slug
* title
* description
* difficulty
* packs
* dialects supported
* dataset reference
* setup SQL or seed data
* expected output
* canonical solutions by dialect
* validation rules
* whether row order matters
* required concepts
* forbidden concepts if needed
* hints, even if not shown initially
* SEO title/meta description, for later
* public explanation page content, for later

Monetisation and SEO:
Monetisation is a future goal, but it should not dominate the first build.

Eventually, I may want:

* SEO landing pages
* public question pages
* native/display ads
* free question limits
* paid plan to remove ads and unlock more questions
* advanced paid packs
* account/progress tracking

However, for the first version, prioritise the actual offline-capable React tool. The marketing/SEO layer can come later as a separate `web`, `www`, or `site` folder in the same repo.

When we do add SEO/marketing later, possible content pages might include:

* homepage
* SQL practice landing page
* dialect landing pages
* question pack pages
* individual question pages
* beginner SQL guide pages
* Snowflake SQL guide pages
* BigQuery SQL guide pages
* “SQL interview questions for analytics engineers”
* warehouse-specific comparison pages

Future dbt direction:
The dbt pack should come later.
Eventually, users should be able to write dbt-style models using simplified:

* ref()
* source()
* config()
* incremental logic
* schema tests
* maybe a mini file-tree
* multiple models leading to a final output

For now, design the architecture so dbt-style challenges can be added later without a total rewrite, but do not build this first unless we explicitly agree.

Product positioning:
This should not just be “SQL for beginners.”
The long-term goal is to make the best SQL practice platform for analytics engineers, data analysts, and analytics-engineering interviews.
The differentiator is realistic warehouse-style analytics problems, dialect-specific practice, messy data, and eventually dbt-style modelling.

MVP proposal:
Please treat this as a proposal, not a final command.

A sensible first version might include:

1. React + Vite + TypeScript.
2. PWA setup with service worker/offline support.
3. Browser SQL execution, likely via DuckDB-Wasm if appropriate.
4. Code editor, probably Monaco or CodeMirror.
5. Structured question bank in TypeScript/JSON files.
6. One or two realistic seeded datasets.
7. Generic SQL dialect first.
8. Placeholder/planned support for Snowflake and BigQuery.
9. Question filters by pack, difficulty, and dialect.
10. Run query and display results.
11. Submit answer and compare to expected output.
12. Show correct/incorrect.
13. Show expected output and canonical solution.

Deliverables:
First, give me:

1. A short research summary on how sql-practice.com seems to work and what we can learn from it.
2. A recommendation for the browser SQL engine.
3. A recommendation for the initial React/PWA architecture.
4. A proposed repo structure.
5. A proposed data model/content schema for questions, datasets, packs, and dialects.
6. An MVP build plan split into small implementation phases.
7. Any major risks, trade-offs, or unknowns.
8. Questions you need me to answer before implementation.

After we agree the architecture and MVP scope, then start implementing.
Use TypeScript.
Keep the architecture clean and easy to extend.
Prioritise simple, working functionality over beautiful UI initially.
Make it easy for me to add new questions as structured files.
