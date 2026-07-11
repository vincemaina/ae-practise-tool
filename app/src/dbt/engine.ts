/**
 * mini-dbt — a tiny dbt-compatible build engine that runs against DuckDB (in the
 * browser via DuckDB-Wasm). Validated by `scripts/dbt-spike.ts`; see the ROADMAP
 * "dbt practice engine" entry. Supports the fundamentals: `{{ ref() }}`,
 * `{{ source() }}`, `{{ config() }}`, `{{ this }}`, `{% if is_incremental() %}`;
 * DAG build order; view / table / incremental / ephemeral materializations;
 * incremental upsert on `unique_key` (delete+insert) or append. Deferred (later):
 * real Jinja (macros/loops via nunjucks), snapshots, tests, packages.
 *
 * Pure compile/render/toposort are unit-tested directly; `build()` emits SQL
 * through a `DbtRunner` so it's testable without a database too.
 */

export type Materialization = 'view' | 'table' | 'incremental' | 'ephemeral';

export interface Model {
  /** Model name = its relation name in the warehouse. */
  name: string;
  /** Raw SQL, with Jinja. */
  sql: string;
}

export interface CompiledModel {
  name: string;
  materialized: Materialization;
  uniqueKey?: string;
  /** Models referenced via `ref()` (drives the DAG). */
  refs: string[];
  /** Sources referenced via `source()`, as `[schema, table]`. */
  sources: [string, string][];
  /** SQL with the `config()` block removed (refs/sources/this still templated). */
  body: string;
}

/** Thrown for authoring/build errors (unknown ref, cycle, bad incremental). */
export class DbtError extends Error {}

const RX = {
  config: /\{\{-?\s*config\(([\s\S]*?)\)\s*-?\}\}/,
  ref: /\{\{-?\s*ref\(\s*'([^']+)'\s*\)\s*-?\}\}/g,
  source: /\{\{-?\s*source\(\s*'([^']+)'\s*,\s*'([^']+)'\s*\)\s*-?\}\}/g,
  self: /\{\{-?\s*this\s*-?\}\}/g,
  incr: /\{%-?\s*if\s+is_incremental\(\)\s*-?%\}([\s\S]*?)\{%-?\s*endif\s*-?%\}/g,
};

/** Parse a model's config + ref/source dependencies. */
export function compileModel(model: Model): CompiledModel {
  const cfg = RX.config.exec(model.sql)?.[1] ?? '';
  const materialized = (/materialized\s*=\s*'([^']+)'/.exec(cfg)?.[1] ?? 'view') as Materialization;
  if (!['view', 'table', 'incremental', 'ephemeral'].includes(materialized)) {
    throw new DbtError(`Model '${model.name}': unknown materialization '${materialized}'`);
  }
  const uniqueKey = /unique_key\s*=\s*'([^']+)'/.exec(cfg)?.[1];
  const body = model.sql.replace(RX.config, '').trim();
  const refs = [...body.matchAll(RX.ref)].map((m) => m[1]!);
  const sources = [...body.matchAll(RX.source)].map((m) => [m[1]!, m[2]!] as [string, string]);
  return { name: model.name, materialized, uniqueKey, refs, sources, body };
}

/** Resolve a model's SQL: substitute ref/source/this and keep or drop the
 *  incremental-only block. `refRelation` lets callers point a ref at either a
 *  real relation or an inlined ephemeral CTE. */
export function renderModel(
  c: CompiledModel,
  opts: {
    isIncremental: boolean;
    refRelation: (name: string) => string;
    sourceRelation: (schema: string, table: string) => string;
  },
): string {
  return c.body
    .replace(RX.incr, (_all, inner: string) => (opts.isIncremental ? inner : ''))
    .replace(RX.ref, (_all, name: string) => opts.refRelation(name))
    .replace(RX.source, (_all, s: string, t: string) => opts.sourceRelation(s, t))
    .replace(RX.self, () => c.name)
    .trim();
}

/** Order models so every model comes after the models it `ref()`s. Throws on a
 *  dependency cycle. Refs to unknown models are the caller's problem (validated
 *  in `build`); here they're just skipped so `topoSort` stays pure. */
export function topoSort(models: CompiledModel[]): CompiledModel[] {
  const byName = new Map(models.map((m) => [m.name, m]));
  const state = new Map<string, 'visiting' | 'done'>();
  const out: CompiledModel[] = [];
  const visit = (m: CompiledModel) => {
    const s = state.get(m.name);
    if (s === 'done') return;
    if (s === 'visiting') throw new DbtError(`Circular dependency involving '${m.name}'`);
    state.set(m.name, 'visiting');
    for (const r of m.refs) {
      const dep = byName.get(r);
      if (dep) visit(dep);
    }
    state.set(m.name, 'done');
    out.push(m);
  };
  models.forEach(visit);
  return out;
}

/** How `build` talks to the warehouse. The app wraps DuckDB-Wasm; tests use a fake. */
export interface DbtRunner {
  run(sql: string): Promise<void>;
  tableExists(name: string): Promise<boolean>;
}

export interface BuildOptions {
  /** Rebuild incremental models from scratch (dbt's `--full-refresh`). */
  fullRefresh?: boolean;
  /** Map `"schema.table"` → relation name (default `schema_table`). */
  sources?: Record<string, string>;
}

export interface BuildResult {
  /** Non-ephemeral models built, in order. */
  order: string[];
  /** Final compiled SQL per built model. */
  compiled: Record<string, string>;
}

const cteName = (name: string) => `__cte__${name}`;

/** Ephemeral models transitively ref'd by `c`, dependencies-first. */
function ephemeralClosure(c: CompiledModel, byName: Map<string, CompiledModel>): CompiledModel[] {
  const out: CompiledModel[] = [];
  const seen = new Set<string>();
  const visit = (m: CompiledModel) => {
    for (const r of m.refs) {
      const dep = byName.get(r);
      if (dep?.materialized === 'ephemeral' && !seen.has(dep.name)) {
        seen.add(dep.name);
        visit(dep); // its own ephemeral deps first
        out.push(dep);
      }
    }
  };
  visit(c);
  return out;
}

/** Compile + build the whole project in dependency order. */
export async function build(
  runner: DbtRunner,
  models: Model[],
  opts: BuildOptions = {},
): Promise<BuildResult> {
  const compiled = models.map(compileModel);
  const byName = new Map(compiled.map((m) => [m.name, m]));
  for (const m of compiled) {
    for (const r of m.refs) {
      if (!byName.has(r)) throw new DbtError(`Model '${m.name}' references unknown model '${r}'`);
    }
    if (m.materialized === 'incremental' && !m.uniqueKey && !/is_incremental/.test(m.body)) {
      // append-only incremental with no filter would duplicate every row.
      throw new DbtError(`Incremental model '${m.name}' needs a unique_key or an is_incremental() filter`);
    }
  }

  const sourceRelation = (s: string, t: string) => opts.sources?.[`${s}.${t}`] ?? `${s}_${t}`;
  const result: BuildResult = { order: [], compiled: {} };

  for (const c of topoSort(compiled)) {
    if (c.materialized === 'ephemeral') continue; // inlined into consumers, not built

    const closure = ephemeralClosure(c, byName);
    const ephSet = new Set(closure.map((e) => e.name));
    const refRelation = (name: string) => (ephSet.has(name) ? cteName(name) : name);
    const isIncremental =
      c.materialized === 'incremental' && !opts.fullRefresh && (await runner.tableExists(c.name));

    const ctes = closure.map(
      (e) => `${cteName(e.name)} AS (${renderModel(e, { isIncremental: false, refRelation, sourceRelation })})`,
    );
    const bodySql = renderModel(c, { isIncremental, refRelation, sourceRelation });
    const sql = ctes.length ? `WITH ${ctes.join(', ')} ${bodySql}` : bodySql;
    result.compiled[c.name] = sql;
    result.order.push(c.name);

    if (c.materialized === 'view') {
      await runner.run(`CREATE OR REPLACE VIEW ${c.name} AS ${sql}`);
    } else if (c.materialized === 'table') {
      await runner.run(`CREATE OR REPLACE TABLE ${c.name} AS ${sql}`);
    } else if (!isIncremental) {
      await runner.run(`CREATE OR REPLACE TABLE ${c.name} AS ${sql}`);
    } else if (c.uniqueKey) {
      // delete+insert upsert
      await runner.run(`CREATE OR REPLACE TEMP TABLE __dbt_inc AS ${sql}`);
      await runner.run(`DELETE FROM ${c.name} WHERE ${c.uniqueKey} IN (SELECT ${c.uniqueKey} FROM __dbt_inc)`);
      await runner.run(`INSERT INTO ${c.name} SELECT * FROM __dbt_inc`);
      await runner.run(`DROP TABLE __dbt_inc`);
    } else {
      // append strategy (no unique_key)
      await runner.run(`INSERT INTO ${c.name} ${sql}`);
    }
  }
  return result;
}
