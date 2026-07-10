/**
 * Dev-only telemetry + feedback client. No-ops in production builds
 * (`import.meta.env.DEV` is false), so the shipped app sends nothing.
 * Posts to the Vite dev-server sink (see vite/dev-feedback.ts).
 */
const DEV = import.meta.env.DEV;

function post(path: string, body: unknown): void {
  if (!DEV) return;
  try {
    void fetch(`/__dev${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* never let telemetry break the app */
  }
}

const route = () => window.location.hash || '/';

export function logEvent(
  type: string,
  opts: { questionId?: string | null; detail?: Record<string, unknown> } = {},
): void {
  post('/events', { type, route: route(), questionId: opts.questionId ?? null, detail: opts.detail });
}

export interface FeedbackInput {
  kind: 'up' | 'down' | 'note';
  message?: string;
  questionId?: string | null;
  questionSlug?: string | null;
  /** PNG data URL of the app at feedback time (best-effort). */
  screenshot?: string;
}

type FeedbackPayload = FeedbackInput & { route: string; queuedAt?: string };

// Feedback is user-authored, so unlike best-effort events we never want to lose
// it: if the dev server is down, stash it in localStorage and resend when the
// server comes back (on startup, on a timer, on 'online', and after any send).
const FEEDBACK_QUEUE_KEY = 'ae-practice:feedback-queue';
const MAX_QUEUED = 25;

function readQueue(): FeedbackPayload[] {
  try {
    const raw = localStorage.getItem(FEEDBACK_QUEUE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as FeedbackPayload[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: FeedbackPayload[]): void {
  try {
    // Keep only the most recent, so a long offline stretch can't grow unbounded.
    localStorage.setItem(FEEDBACK_QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUED)));
  } catch {
    /* localStorage full/unavailable — best-effort */
  }
}

/** POST one feedback payload; resolves true on a 2xx, false on any failure. */
async function postFeedback(payload: FeedbackPayload): Promise<boolean> {
  try {
    const res = await fetch('/__dev/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

let flushing = false;
/** Resend any queued feedback; keep whatever still fails. Safe to call anytime. */
export async function flushFeedbackQueue(): Promise<void> {
  if (!DEV || flushing) return;
  const queue = readQueue();
  if (queue.length === 0) return;
  flushing = true;
  try {
    const remaining: FeedbackPayload[] = [];
    for (const item of queue) {
      if (!(await postFeedback(item))) remaining.push(item);
    }
    writeQueue(remaining);
  } finally {
    flushing = false;
  }
}

export function sendFeedback(fb: FeedbackInput): void {
  if (!DEV) return;
  const payload: FeedbackPayload = { ...fb, route: route() };
  void postFeedback(payload).then((ok) => {
    if (ok) {
      // Server is up — good moment to drain anything that queued while it was down.
      void flushFeedbackQueue();
    } else {
      const queue = readQueue();
      queue.push({ ...payload, queuedAt: new Date().toISOString() });
      writeQueue(queue);
    }
  });
}

let installed = false;
/** Install global error + click capture once (dev only). */
export function installTelemetry(): void {
  if (!DEV || installed) return;
  installed = true;

  window.addEventListener('error', (e) => {
    logEvent('error', {
      detail: { message: e.message, source: `${e.filename}:${e.lineno}:${e.colno}`, stack: e.error?.stack },
    });
  });
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason as { message?: string; stack?: string } | undefined;
    logEvent('error', {
      detail: { kind: 'unhandledrejection', message: String(reason?.message ?? e.reason), stack: reason?.stack },
    });
  });
  document.addEventListener(
    'click',
    (e) => {
      const el = (e.target as HTMLElement | null)?.closest?.('[data-testid]');
      if (el) logEvent('click', { detail: { testid: el.getAttribute('data-testid') } });
    },
    true,
  );

  // Deliver any feedback that queued while the server was down: now (on load),
  // when connectivity returns, and on a timer (a restarted dev server doesn't
  // fire 'online', so poll — cheap: no-ops when the queue is empty).
  void flushFeedbackQueue();
  window.addEventListener('online', () => void flushFeedbackQueue());
  setInterval(() => void flushFeedbackQueue(), 15_000);

  logEvent('session_start', { detail: { ua: navigator.userAgent, viewport: `${window.innerWidth}x${window.innerHeight}` } });
}
