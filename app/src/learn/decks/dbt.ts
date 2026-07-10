import type { Deck } from '../types';

/**
 * dbt fundamentals deck. Facts verified against docs.getdbt.com (2026), including
 * recent changes: `data_tests:` key (v1.8), unit tests (v1.8), five built-in
 * materializations incl. materialized_view, snapshots-in-YAML (v1.9), and that
 * `dbt build` orders by DAG (not by resource type). Keep answers concise.
 */
export const dbtDeck: Deck = {
  id: 'dbt',
  title: 'dbt fundamentals',
  description: 'Core dbt concepts, commands, and config — analytics-engineering interview prep.',
  cards: [
    {
      id: 'dbt-model',
      front: 'What is a dbt "model"?',
      back: 'A single SELECT statement in a .sql file under models/. dbt wraps it in the right DDL/DML and builds it into the warehouse.',
    },
    {
      id: 'dbt-ref',
      front: 'What does ref() do?',
      back: 'References another dbt-built resource (model, seed, or snapshot). It compiles to that object’s real database name and adds a dependency edge, so dbt builds things in order.',
      code: "select * from {{ ref('stg_orders') }}",
    },
    {
      id: 'dbt-source',
      front: 'What does source() do?',
      back: 'References raw external data dbt did NOT build (loaded by an ingestion tool). It also adds a lineage edge from the source into your models.',
      code: "select * from {{ source('jaffle_shop', 'orders') }}",
    },
    {
      id: 'dbt-ref-vs-source',
      front: 'ref() vs source() in one line?',
      back: 'ref() = things dbt manages/builds; source() = raw external tables dbt only reads. Both feed the DAG.',
    },
    {
      id: 'dbt-why-ref',
      front: 'Why use ref() instead of hardcoding a table name?',
      back: 'It builds the DAG (lineage + correct build order) and makes schema/database names environment-aware, so the same code runs across dev and prod targets.',
    },
    {
      id: 'dbt-source-yaml',
      front: 'How are sources declared?',
      back: 'In a .yml file under a sources: key — name, optional database/schema, and the tables.',
      code: `sources:
  - name: jaffle_shop
    schema: raw
    tables:
      - name: orders
      - name: customers`,
    },
    {
      id: 'dbt-materializations',
      front: 'What are the five built-in materializations?',
      back: 'view, table, incremental, ephemeral, and materialized_view.',
    },
    {
      id: 'dbt-mat-view-table',
      front: 'view vs table materialization?',
      back: 'view rebuilds as a database view each run (no stored data). table drops and rebuilds a physical table each run (faster to query, slower to build).',
    },
    {
      id: 'dbt-mat-incremental',
      front: 'What is the incremental materialization?',
      back: 'Inserts/updates only new or changed rows since the last run instead of rebuilding the whole table — for large, append-heavy datasets.',
    },
    {
      id: 'dbt-mat-ephemeral',
      front: 'What is the ephemeral materialization?',
      back: 'Not built in the database — its SQL is inlined as a CTE into the models that ref() it. Good for lightweight intermediate logic.',
    },
    {
      id: 'dbt-mat-materialized-view',
      front: 'What is the materialized_view materialization?',
      back: 'Creates/maintains a database materialized view (stored, periodically refreshed) — a middle ground between view and incremental. Adapter-dependent; added in v1.6.',
    },
    {
      id: 'dbt-snapshot-not-mat',
      front: 'Is snapshot a materialization?',
      back: 'No — snapshots are a separate resource type with their own files/command, not a value of the materialized config.',
    },
    {
      id: 'dbt-config',
      front: 'How do you set a model’s materialization in the model file?',
      back: 'With a Jinja config() call at the top. Config can also live in a YAML file or dbt_project.yml.',
      code: "{{ config(materialized='table') }}",
    },
    {
      id: 'dbt-generic-vs-singular',
      front: 'Generic tests vs singular tests?',
      back: 'Generic tests are reusable, parameterized tests applied in YAML to columns/models. Singular tests are one-off SELECT statements in tests/*.sql that return the failing rows.',
    },
    {
      id: 'dbt-builtin-tests',
      front: 'Name the four built-in generic tests.',
      back: 'unique, not_null, accepted_values, and relationships (referential integrity / foreign-key).',
    },
    {
      id: 'dbt-data-tests-key',
      front: 'Which YAML key attaches data tests to a model (current dbt)?',
      back: 'data_tests: (renamed from tests: in v1.8). The old tests: key still works for back-compat, but data_tests: is current.',
      code: `models:
  - name: orders
    columns:
      - name: id
        data_tests: [unique, not_null]`,
    },
    {
      id: 'dbt-unit-tests',
      front: 'What are unit tests, and how do they differ from data tests?',
      back: 'Unit tests (added v1.8) check a model’s SQL logic against small static mock inputs BEFORE it materializes. Data tests run AFTER materialization against real warehouse data. `dbt test` runs both.',
    },
    {
      id: 'dbt-run',
      front: 'What does `dbt run` do?',
      back: 'Executes models — builds the views/tables/incrementals/materialized views. It does not run tests, seeds, or snapshots.',
    },
    {
      id: 'dbt-build',
      front: 'What does `dbt build` do, and in what order?',
      back: 'Runs models, tests, snapshots, and seeds together in DAG (dependency) order — not by resource type. A resource’s tests run right after it builds, and a failing test SKIPs its downstream dependents.',
    },
    {
      id: 'dbt-seed',
      front: 'What does `dbt seed` do?',
      back: 'Loads CSV files from the seeds/ directory into the warehouse as tables. For small, static, version-controlled reference data — not raw operational data.',
    },
    {
      id: 'dbt-compile',
      front: 'What does `dbt compile` do?',
      back: 'Compiles Jinja-SQL to raw SQL in target/ without running anything against the warehouse. Useful for inspecting what dbt will execute.',
    },
    {
      id: 'dbt-docs',
      front: 'What does `dbt docs generate` do?',
      back: 'Builds the documentation-site artifacts (catalog.json, etc.) from your models, descriptions, and DAG. Serve it locally with `dbt docs serve`.',
    },
    {
      id: 'dbt-deps',
      front: 'What does `dbt deps` do?',
      back: 'Installs the packages listed in packages.yml (e.g. dbt_utils) into dbt_packages/.',
    },
    {
      id: 'dbt-is-incremental',
      front: 'In an incremental model, what does is_incremental() do?',
      back: 'Returns true only when the model already exists as a table and you’re not doing a --full-refresh. Guard a WHERE clause with it to process only new rows.',
      code: `{% if is_incremental() %}
  where updated_at > (select max(updated_at) from {{ this }})
{% endif %}`,
    },
    {
      id: 'dbt-unique-key',
      front: 'What does unique_key do in an incremental model?',
      back: 'Identifies existing rows so matching new data updates (upserts) instead of inserting duplicates. Can be one column or a list.',
    },
    {
      id: 'dbt-on-schema-change',
      front: 'What does on_schema_change control (and its default)?',
      back: 'What happens when an incremental model’s columns change between runs. Default is ignore (new columns silently dropped); options include fail, append_new_columns, sync_all_columns.',
    },
    {
      id: 'dbt-full-refresh',
      front: 'How do you force an incremental model to rebuild from scratch?',
      back: '`dbt run --full-refresh` — drops and rebuilds the table, bypassing is_incremental().',
    },
    {
      id: 'dbt-snapshots',
      front: 'What are snapshots for, and the two strategies?',
      back: 'Type-2 Slowly Changing Dimensions — recording how mutable source rows change over time. Strategies: timestamp (uses an updated_at column, recommended) and check (compares check_cols).',
    },
    {
      id: 'dbt-jinja-syntax',
      front: '{{ }} vs {% %} in Jinja?',
      back: '{{ ... }} is an expression — it outputs a value (e.g. {{ ref(\'x\') }}). {% ... %} is a statement/tag — control flow with no direct output (if/for/set). {# ... #} is a comment.',
    },
    {
      id: 'dbt-project-vs-profiles',
      front: 'dbt_project.yml vs profiles.yml?',
      back: 'dbt_project.yml defines the project (name, paths, project-wide config) and is committed. profiles.yml holds connection credentials + targets (dev/prod), lives outside the repo (~/.dbt/), and is kept out of version control.',
    },
    {
      id: 'dbt-dag',
      front: 'What is the DAG in dbt?',
      back: 'The Directed Acyclic Graph of dependencies dbt infers from ref()/source() calls. It sets build order and powers the lineage docs.',
    },
    {
      id: 'dbt-this',
      front: 'What does {{ this }} refer to?',
      back: 'The current model’s own relation (its database/schema/table). Commonly used inside incremental models, e.g. select max(updated_at) from {{ this }}.',
    },
  ],
};
