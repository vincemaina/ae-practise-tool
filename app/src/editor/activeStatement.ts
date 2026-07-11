import { ViewPlugin, Decoration, EditorView, type DecorationSet } from '@codemirror/view';
import { StateEffect, StateField } from '@codemirror/state';
import { statementForCursor, statementCount } from './statement';

/**
 * The active-statement highlight is a *preview* of what ⌘/Ctrl+Enter will run:
 * it appears only while Ctrl/Cmd is held (and the editor is focused), and takes
 * visual precedence over the grey current-line highlight (see `.cm-active-statement`
 * CSS). Held state lives in a StateField toggled by key/blur handlers.
 */
const setModHeld = StateEffect.define<boolean>();

const modHeldField = StateField.define<boolean>({
  create: () => false,
  update(value, tr) {
    for (const e of tr.effects) if (e.is(setModHeld)) return e.value;
    return value;
  },
});

// Highlight the statement the cursor is in — but only when the worksheet holds
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

const highlightPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    private onKey: (e: KeyboardEvent) => void;
    private onBlur: () => void;

    constructor(view: EditorView) {
      this.decorations = this.build(view);
      const sync = (held: boolean) => {
        if (held !== view.state.field(modHeldField)) {
          view.dispatch({ effects: setModHeld.of(held) });
        }
      };
      // Only preview while the editor is focused (Cmd+Enter only runs then).
      this.onKey = (e) => sync((e.ctrlKey || e.metaKey) && view.hasFocus);
      this.onBlur = () => sync(false);
      window.addEventListener('keydown', this.onKey);
      window.addEventListener('keyup', this.onKey);
      window.addEventListener('blur', this.onBlur);
    }

    update(u: { view: EditorView }) {
      this.decorations = this.build(u.view);
    }

    build(view: EditorView): DecorationSet {
      return view.state.field(modHeldField, false) ? compute(view) : Decoration.none;
    }

    destroy() {
      window.removeEventListener('keydown', this.onKey);
      window.removeEventListener('keyup', this.onKey);
      window.removeEventListener('blur', this.onBlur);
    }
  },
  { decorations: (v) => v.decorations },
);

export function activeStatementHighlight() {
  return [modHeldField, highlightPlugin];
}
