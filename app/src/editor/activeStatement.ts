import { ViewPlugin, Decoration, EditorView, type DecorationSet } from '@codemirror/view';
import { statementForCursor, statementCount } from './statement';

// Highlights the statement the cursor is in — but only when the worksheet holds
// more than one statement, so a single-query answer stays visually clean.
function compute(view: EditorView): DecorationSet {
  const doc = view.state.doc.toString();
  if (statementCount(doc) < 2) return Decoration.none;

  const s = statementForCursor(doc, view.state.selection.main.head);
  if (!s || s.to <= s.from) return Decoration.none;

  const startLine = view.state.doc.lineAt(s.from).number;
  const endLine = view.state.doc.lineAt(s.to).number;
  const lines = [];
  for (let ln = startLine; ln <= endLine; ln++) {
    lines.push(Decoration.line({ class: 'cm-active-statement' }).range(view.state.doc.line(ln).from));
  }
  return Decoration.set(lines);
}

export function activeStatementHighlight() {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = compute(view);
      }
      update(u: { selectionSet: boolean; docChanged: boolean; view: EditorView }) {
        if (u.selectionSet || u.docChanged) this.decorations = compute(u.view);
      }
    },
    { decorations: (v) => v.decorations },
  );
}
