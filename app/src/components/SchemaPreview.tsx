import { useEffect, useState } from 'react';
import type { Dataset } from '../content/types';
import { runQuery } from '../engine/duckdb';
import type { Cell } from '../grading/types';
import { formatCell, isNumeric } from './formatCell';

interface TablePreview {
  name: string;
  columns: { name: string; type: string }[];
  rows: Cell[][];
}

/** Shows each table's columns (with DuckDB types) and a few sample rows, fetched
 *  live from the engine — so problems feel concrete, not abstract. */
export function SchemaPreview({ dataset, ready }: { dataset: Dataset; ready: boolean }) {
  const [tables, setTables] = useState<TablePreview[] | null>(null);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      try {
        const out: TablePreview[] = [];
        for (const t of dataset.tables) {
          const described = await runQuery(`DESCRIBE ${t.name}`);
          const typeByName = new Map(
            described.rows.map((r) => [String(r[0]), String(r[1])]),
          );
          const sample = await runQuery(`SELECT * FROM ${t.name} LIMIT 4`);
          out.push({
            name: t.name,
            columns: sample.columns.map((c) => ({
              name: c.name,
              type: typeByName.get(c.name) ?? '',
            })),
            rows: sample.rows,
          });
        }
        if (!cancelled) setTables(out);
      } catch {
        if (!cancelled) setTables([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dataset, ready]);

  return (
    <div className="card">
      <span className="section-label">Schema &amp; sample data · {dataset.title}</span>
      {!tables && <p className="muted">Loading sample data…</p>}
      {tables?.map((t) => (
        <div key={t.name} className="schema-table">
          <div className="schema-table-name mono">{t.name}</div>
          <div className="results-wrap">
            <table className="results-table">
              <thead>
                <tr>
                  {t.columns.map((c, i) => (
                    <th key={i}>
                      <span className="col-name">{c.name}</span>
                      {c.type && <span className="col-type">{c.type.toLowerCase()}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {t.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} className={isNumeric(cell) ? 'num' : undefined}>
                        {cell === null || cell === undefined ? (
                          <span className="null">NULL</span>
                        ) : (
                          formatCell(cell)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
