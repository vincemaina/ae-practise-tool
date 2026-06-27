import { useEffect, useMemo, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql, type SQLNamespace } from '@codemirror/lang-sql';
import { EditorView, keymap } from '@codemirror/view';
import { linter, lintGutter, type Diagnostic } from '@codemirror/lint';
import { syntaxTree } from '@codemirror/language';
import { oneDark } from '@codemirror/theme-one-dark';
import { duckdbDialect } from '../editor/sqlDialect';
import { statementForCursor } from '../editor/statement';
import { activeStatementHighlight } from '../editor/activeStatement';
import type { SqlError } from '../engine/duckdb';

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Run the statement at the cursor (⌘/Ctrl+Enter). */
  onRun?: (sql: string) => void;
  /** Fires with the statement at the cursor whenever it changes (for the Run button). */
  onActiveStatement?: (sql: string) => void;
  /** Tables → columns for schema-aware autocomplete. */
  schema?: SQLNamespace;
  readOnly?: boolean;
  /** Async validator (the DuckDB engine) for inline error squiggles. */
  validate?: (sql: string) => Promise<SqlError | null>;
  placeholder?: string;
  dark?: boolean;
  /** Fill the parent's height (worksheet mode) instead of a fixed height. */
  fill?: boolean;
}

/** Lenient parse-error squiggles from the SQL grammar (catches unbalanced
 *  parens, stray tokens) — instant, no engine round-trip. */
function syntaxLinter(view: EditorView): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  syntaxTree(view.state)
    .cursor()
    .iterate((node) => {
      if (node.type.isError) {
        const to = node.to > node.from ? node.to : Math.min(view.state.doc.length, node.from + 1);
        diagnostics.push({ from: node.from, to, severity: 'error', message: 'Syntax error' });
      }
    });
  return diagnostics;
}

export function SqlEditor({
  value,
  onChange,
  onRun,
  onActiveStatement,
  schema,
  readOnly,
  validate,
  placeholder,
  dark,
  fill,
}: Props) {
  const onRunRef = useRef(onRun);
  const onActiveRef = useRef(onActiveStatement);
  const validateRef = useRef(validate);
  useEffect(() => {
    onRunRef.current = onRun;
    onActiveRef.current = onActiveStatement;
    validateRef.current = validate;
  });

  const extensions = useMemo(
    () => [
      sql({ dialect: duckdbDialect, schema, upperCaseKeywords: false }),
      EditorView.lineWrapping,
      activeStatementHighlight(),
      keymap.of([
        {
          key: 'Mod-Enter',
          run: (view) => {
            const s = statementForCursor(view.state.doc.toString(), view.state.selection.main.head);
            if (s) onRunRef.current?.(s.text);
            return true;
          },
        },
      ]),
      // Report the statement at the cursor so the Run button runs the same thing.
      EditorView.updateListener.of((u) => {
        if (u.selectionSet || u.docChanged) {
          const s = statementForCursor(u.state.doc.toString(), u.state.selection.main.head);
          onActiveRef.current?.(s?.text ?? '');
        }
      }),
      lintGutter(),
      linter(syntaxLinter),
      // Engine-backed validation of the statement at the cursor; on error, mark
      // that statement (line-precise mapping across statements isn't worth it).
      linter(
        async (view) => {
          const fn = validateRef.current;
          if (!fn) return [];
          const s = statementForCursor(view.state.doc.toString(), view.state.selection.main.head);
          if (!s) return [];
          const err = await fn(s.text);
          if (!err) return [];
          return [
            { from: s.from, to: Math.max(s.from + 1, s.to), severity: 'error', message: err.message },
          ];
        },
        { delay: 500 },
      ),
    ],
    [schema],
  );

  return (
    <div className={`sql-editor ${fill ? 'fill' : ''}`} data-testid="editor">
      <CodeMirror
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        extensions={extensions}
        placeholder={placeholder}
        theme={dark ? oneDark : 'light'}
        height={fill ? '100%' : '200px'}
      />
    </div>
  );
}
