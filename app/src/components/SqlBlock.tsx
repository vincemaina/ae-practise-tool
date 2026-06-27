import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { EditorView } from '@codemirror/view';
import { oneDark } from '@codemirror/theme-one-dark';
import { duckdbDialect } from '../editor/sqlDialect';

/** Read-only, syntax-highlighted SQL (e.g. the canonical solution on reveal). */
export function SqlBlock({ code, dark, testId }: { code: string; dark: boolean; testId?: string }) {
  return (
    <div className="sql-block" data-testid={testId}>
      <CodeMirror
        value={code}
        editable={false}
        extensions={[sql({ dialect: duckdbDialect }), EditorView.lineWrapping]}
        theme={dark ? oneDark : 'light'}
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
          highlightActiveLine: false,
          highlightActiveLineGutter: false,
          autocompletion: false,
        }}
      />
    </div>
  );
}
