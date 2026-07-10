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

/** Compact schema panel: each table's columns as a one-line list (so a
 *  multi-table dataset stays short), with a toggle to reveal the sample rows.
 *  Sample data is fetched live from the engine. */
export function SchemaPreview({ dataset, ready }: { dataset: Dataset; ready: boolean }) {
  const [tables, setTables] = useState<TablePreview[] | null>(null);
  const [showData, setShowData] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      try {
        const out: TablePreview[] = [];
        for (const t of dataset.tables) {
          const described = await runQuery(`DESCRIBE ${t.name}`);
          const typeByName = new Map(described.rows.map((r) => [String(r[0]), String(r[1])]));
          const sample = await runQuery(`SELECT * FROM ${t.name} LIMIT 4`);
          out.push({
            name: t.name,
            columns: sample.columns.map((c) => ({ name: c.name, type: typeByName.get(c.name) ?? '' })),
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
    <div className="card schema-card">
      <div className="card-head">
        <span className="section-label">Schema · {dataset.title}</span>
        {tables && tables.length > 0 && (
          <button
            type="button"
            className="link-btn"
            onClick={() => setShowData((v) => !v)}
            data-testid="toggle-schema-data"
          >
            {showData ? 'Hide sample rows' : 'Show sample rows'}
          </button>
        )}
      </div>

      {!tables && <p className="muted">Loading schema…</p>}

      {tables?.map((t) => (
        <div key={t.name} className="schema-table">
          <div className="schema-line">
            <span className="schema-tname mono">{t.name}</span>
            <span className="schema-cols mono">{t.columns.map((c) => c.name).join(', ')}</span>
          </div>

          {showData && (
            <div className="results-wrap schema-sample">
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
          )}
        </div>
      ))}
    </div>
  );
}
