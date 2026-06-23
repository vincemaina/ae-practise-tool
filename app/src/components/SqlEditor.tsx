import { useEffect, useMemo, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql, SQLDialect, type SQLNamespace } from '@codemirror/lang-sql';
import { EditorView, keymap } from '@codemirror/view';
import { linter, lintGutter, type Diagnostic } from '@codemirror/lint';
import { syntaxTree } from '@codemirror/language';
import { oneDark } from '@codemirror/theme-one-dark';
import type { SqlError } from '../engine/duckdb';

// DuckDB-flavoured dialect for highlighting + keyword completion (incl. QUALIFY).
const duckdbDialect = SQLDialect.define({
  keywords:
    'select from where group by having order asc desc limit offset join inner left right full outer cross natural on using as and or not in is null like ilike similar between case when then else end union all except intersect distinct with recursive over partition qualify window rows range unbounded preceding following current row exists filter within fetch first next only lateral',
  builtin:
    'count sum avg min max coalesce nullif round abs ceil floor greatest least row_number rank dense_rank ntile percent_rank cume_dist lag lead first_value last_value nth_value string_agg array_agg list date_trunc date_part datediff extract now current_date current_timestamp epoch length lower upper trim ltrim rtrim substring substr replace concat regexp_matches strftime try_cast cast',
  types:
    'int integer bigint smallint tinyint hugeint usmallint uinteger ubigint double real float decimal numeric varchar char text string boolean bool date time timestamp timestamptz interval blob uuid json struct list map',
});

interface Props {
  value: string;
  onChange: (value: string) => void;
  onRun?: () => void;
  /** Tables → columns for schema-aware autocomplete. */
  schema?: SQLNamespace;
  readOnly?: boolean;
  /** Async validator (the DuckDB engine) for inline error squiggles. */
  validate?: (sql: string) => Promise<SqlError | null>;
  placeholder?: string;
  dark?: boolean;
}

/** Lenient parse-error squiggles from the SQL grammar (catches unbalanced
 *  parens, stray tokens) — instant, no engine round-trip. */
function syntaxLinter(view: EditorView): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  syntaxTree(view.state)
    .cursor()
    .iterate((node) => {
      if (node.type.isError) {
        const to =
          node.to > node.from ? node.to : Math.min(view.state.doc.length, node.from + 1);
        diagnostics.push({ from: node.from, to, severity: 'error', message: 'Syntax error' });
      }
    });
  return diagnostics;
}

export function SqlEditor({
  value,
  onChange,
  onRun,
  schema,
  readOnly,
  validate,
  placeholder,
  dark,
}: Props) {
  const onRunRef = useRef(onRun);
  const validateRef = useRef(validate);
  useEffect(() => {
    onRunRef.current = onRun;
    validateRef.current = validate;
  });

  const extensions = useMemo(
    () => [
      sql({ dialect: duckdbDialect, schema, upperCaseKeywords: false }),
      EditorView.lineWrapping,
      keymap.of([
        {
          key: 'Mod-Enter',
          run: () => {
            onRunRef.current?.();
            return true;
          },
        },
      ]),
      lintGutter(),
      linter(syntaxLinter),
      // Engine-backed validation: real DuckDB errors mapped to the offending line.
      linter(
        async (view) => {
          const fn = validateRef.current;
          if (!fn) return [];
          const text = view.state.doc.toString();
          if (!text.trim()) return [];
          const err = await fn(text);
          if (!err) return [];
          let from = 0;
          let to = view.state.doc.length;
          if (err.line && err.line >= 1 && err.line <= view.state.doc.lines) {
            const docLine = view.state.doc.line(err.line);
            from = docLine.from;
            to = docLine.to;
          }
          return [{ from, to, severity: 'error', message: err.message }];
        },
        { delay: 500 },
      ),
    ],
    [schema],
  );

  return (
    <div className="sql-editor" data-testid="editor">
      <CodeMirror
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        extensions={extensions}
        placeholder={placeholder}
        theme={dark ? oneDark : 'light'}
        height="200px"
      />
    </div>
  );
}
