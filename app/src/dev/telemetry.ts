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

export function sendFeedback(fb: FeedbackInput): void {
  post('/feedback', { ...fb, route: route() });
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

  logEvent('session_start', { detail: { ua: navigator.userAgent, viewport: `${window.innerWidth}x${window.innerHeight}` } });
}
