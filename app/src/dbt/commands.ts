/**
 * The dbt "terminal": parse a `dbt <subcommand>` line and run it via the engine,
 * returning dbt-flavoured output lines. v2a supports `compile` (render only),
 * `run`/`build` (materialize), and `--full-refresh`. `dbt test` comes in v2b.
 * Pure logic over a runner + a rowCount fn, so it's unit-testable.
 */
import {
  build,
  compileModel,
  renderModel,
  topoSort,
  DbtError,
  type DbtRunner,
  type Model,
} from './engine';

export interface CommandResult {
  lines: string[];
  ok: boolean;
}

const errLine = (e: unknown): string =>
  e instanceof DbtError ? e.message : (String(e).replace(/^Error:\s*/, '').split('\n')[0] ?? '');

/** The value passed to `--select`/`-s`, if any. */
function selectArg(parts: string[]): string | undefined {
  const i = parts.findIndex((p) => p === '-s' || p === '--select');
  return i >= 0 ? parts[i + 1] : undefined;
}

/** Models to build for `--select <sel>`: the named model + its upstream deps
 *  (so it resolves in a fresh build). v2a ignores the `+`/graph operators. */
function selectSubgraph(models: Model[], selector: string): Model[] {
  const name = selector.replace(/[+@*]/g, '');
  const byName = new Map(models.map((m) => [m.name, m]));
  if (!byName.has(name)) throw new DbtError(`model '${name}' not found`);
  const wanted = new Set<string>();
  const visit = (n: string) => {
    if (wanted.has(n)) return;
    wanted.add(n);
    const m = byName.get(n);
    if (m) for (const r of compileModel(m).refs) visit(r);
  };
  visit(name);
  return models.filter((m) => wanted.has(m.name));
}

export async function runDbtCommand(
  runner: DbtRunner,
  rowCount: (name: string) => Promise<number>,
  command: string,
  models: Model[],
): Promise<CommandResult> {
  const parts = command.trim().split(/\s+/).filter(Boolean);
  if (parts[0] !== 'dbt') {
    return {
      lines: [
        `command not found: ${parts[0] ?? ''} — this is the dbt terminal (try 'dbt build', 'dbt run', 'dbt compile'). To query the warehouse, use the SQL tab.`,
      ],
      ok: false,
    };
  }
  const sub = parts[1];
  const fullRefresh = parts.includes('--full-refresh');
  const lines: string[] = [];

  const sel = selectArg(parts);
  let selected = models;
  if (sel !== undefined) {
    try {
      selected = selectSubgraph(models, sel);
    } catch (e) {
      return { lines: [errLine(e)], ok: false };
    }
  }

  if (sub === 'compile') {
    try {
      const compiled = topoSort(selected.map(compileModel)).filter((c) => c.materialized !== 'ephemeral');
      lines.push(`Compiled ${compiled.length} model${compiled.length === 1 ? '' : 's'}.`);
      for (const c of compiled) {
        lines.push(`\n-- target/compiled/${c.name}.sql`);
        lines.push(
          renderModel(c, {
            isIncremental: false,
            refRelation: (n) => n,
            sourceRelation: (s, t) => `${s}_${t}`,
          }),
        );
      }
      return { lines, ok: true };
    } catch (e) {
      return { lines: [errLine(e)], ok: false };
    }
  }

  if (sub === 'run' || sub === 'build') {
    lines.push(
      `Running with mini-dbt — found ${models.length} model${models.length === 1 ? '' : 's'}` +
        (sel !== undefined ? `, building ${selected.length} (selected '${sel}')` : ''),
    );
    if (fullRefresh) lines.push(`(full refresh)`);
    try {
      const res = await build(runner, selected, { fullRefresh });
      const incr = new Set(res.incremental);
      for (const name of res.order)
        lines.push(`  OK ${name} [${await rowCount(name)} rows]${incr.has(name) ? ' (incremental)' : ''}`);
      lines.push(`Done. Built ${res.order.length} model${res.order.length === 1 ? '' : 's'}.`);
      return { lines, ok: true };
    } catch (e) {
      lines.push(`  ERROR ${errLine(e)}`);
      return { lines, ok: false };
    }
  }

  return {
    lines: [`Unknown or unsupported command 'dbt ${sub ?? ''}' — try build, run, or compile`],
    ok: false,
  };
}
