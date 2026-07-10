// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendFeedback, flushFeedbackQueue } from './telemetry';

const KEY = 'ae-practice:feedback-queue';
const tick = () => new Promise((r) => setTimeout(r, 0));
const queue = () => JSON.parse(localStorage.getItem(KEY) ?? '[]') as { message?: string }[];

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe('feedback resilience', () => {
  it('queues feedback to localStorage when the POST fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('server down');
      }),
    );
    sendFeedback({ kind: 'note', message: 'save me' });
    await tick();
    expect(queue()).toHaveLength(1);
    expect(queue()[0]!.message).toBe('save me');
  });

  it('does not queue when the POST succeeds', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true }) as Response));
    sendFeedback({ kind: 'up' });
    await tick();
    expect(queue()).toHaveLength(0);
  });

  it('flushes the queue and clears it once the server is back', async () => {
    localStorage.setItem(KEY, JSON.stringify([{ kind: 'note', message: 'queued', route: '/' }]));
    const fetchMock = vi.fn(async () => ({ ok: true }) as Response);
    vi.stubGlobal('fetch', fetchMock);
    await flushFeedbackQueue();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(queue()).toHaveLength(0);
  });

  it('keeps items queued if the flush still fails', async () => {
    localStorage.setItem(KEY, JSON.stringify([{ kind: 'note', message: 'x', route: '/' }]));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('still down');
      }),
    );
    await flushFeedbackQueue();
    expect(queue()).toHaveLength(1);
  });

  it('delivers a queued item after a later successful send drains the backlog', async () => {
    // First send fails → queued.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('down');
      }),
    );
    sendFeedback({ kind: 'note', message: 'first' });
    await tick();
    expect(queue()).toHaveLength(1);

    // Server returns; a new successful send triggers a flush of the backlog too.
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true }) as Response));
    sendFeedback({ kind: 'note', message: 'second' });
    await tick();
    await tick();
    expect(queue()).toHaveLength(0);
  });
});
