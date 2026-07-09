import { useEffect, useRef, useState } from 'react';
import { sendFeedback } from './telemetry';

/**
 * Dev-only feedback button (bottom-left). One submission bundles an optional
 * 👍/👎 sentiment with an optional note, sent only when you hit Submit — nothing
 * is sent on the thumbs alone. Auto-tags the current question.
 */
export function FeedbackWidget({
  questionId,
  questionSlug,
}: {
  questionId: string | null;
  questionSlug: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [sentiment, setSentiment] = useState<'up' | 'down' | null>(null);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  function reset() {
    setOpen(false);
    setSentiment(null);
    setMessage('');
  }

  const canSubmit = sentiment !== null || message.trim() !== '';

  /** Snapshot the app (DOM → PNG), excluding this widget. Best-effort. */
  async function captureScreenshot(): Promise<string | undefined> {
    try {
      const { toPng } = await import('html-to-image');
      return await toPng(document.body, {
        pixelRatio: 1,
        cacheBust: true,
        filter: (node) => !(node instanceof Element && node.classList.contains('feedback-widget')),
      });
    } catch {
      return undefined;
    }
  }

  async function submit() {
    if (!canSubmit || busy) return;
    setBusy(true);
    const kind = sentiment ?? 'note';
    const text = message.trim() || undefined;
    const screenshot = await captureScreenshot();
    sendFeedback({ kind, message: text, questionId, questionSlug, screenshot });
    setBusy(false);
    reset();
    setSent(true);
    setTimeout(() => setSent(false), 1800);
  }

  return (
    <div className="feedback-widget" ref={ref}>
      {sent && <div className="feedback-toast">Feedback sent ✓</div>}

      {open && (
        <div className="feedback-pop">
          <div className="feedback-pop-head">
            <strong>Feedback</strong>
            <span className="muted">{questionSlug ?? 'this page'}</span>
          </div>
          <div className="feedback-votes">
            <button
              type="button"
              className={`vote ${sentiment === 'up' ? 'selected' : ''}`}
              onClick={() => setSentiment((s) => (s === 'up' ? null : 'up'))}
              aria-pressed={sentiment === 'up'}
              aria-label="Thumbs up"
            >
              👍
            </button>
            <button
              type="button"
              className={`vote ${sentiment === 'down' ? 'selected' : ''}`}
              onClick={() => setSentiment((s) => (s === 'down' ? null : 'down'))}
              aria-pressed={sentiment === 'down'}
              aria-label="Thumbs down"
            >
              👎
            </button>
          </div>
          <textarea
            className="feedback-text"
            placeholder="What's good / what could be better on this question?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />
          <div className="feedback-actions">
            <button type="button" onClick={reset} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="primary" onClick={submit} disabled={!canSubmit || busy}>
              {busy ? 'Sending…' : 'Submit'}
            </button>
          </div>
        </div>
      )}

      <button
        className="feedback-fab"
        onClick={() => (open ? reset() : setOpen(true))}
        aria-label="Leave feedback"
        title="Leave feedback (dev)"
      >
        💬
      </button>
    </div>
  );
}
