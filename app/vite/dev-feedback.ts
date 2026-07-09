import type { Plugin } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Dev-only feedback + telemetry sink. While `pnpm dev` runs (on the host), the
 * app POSTs feedback and page events here and we persist them to a SQLite file
 * on the shared mount (`<repo>/.dev-data/feedback.sqlite`). The agent reads that
 * DB from the container via `python3 scripts/dev-feedback.py`. Not part of the
 * production build (apply: 'serve'); keeps the shipped app backend-free.
 */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS feedback (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  kind           TEXT NOT NULL,            -- up | down | note
  message        TEXT,
  route          TEXT,
  question_id    TEXT,
  question_slug  TEXT,
  status         TEXT NOT NULL DEFAULT 'open',  -- open | addressed
  addressed_at   TEXT,
  addressed_note TEXT,
  user_agent     TEXT,
  screenshot     TEXT             -- relative path to PNG under .dev-data/
);
CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  type        TEXT NOT NULL,
  route       TEXT,
  question_id TEXT,
  detail      TEXT
);
`;

// Minimal structural type so we don't hard-depend on better-sqlite3's types.
interface Stmt {
  run: (...args: unknown[]) => { lastInsertRowid: number | bigint; changes: number };
}
interface DB {
  prepare: (sql: string) => Stmt;
  exec: (sql: string) => void;
  pragma: (s: string) => void;
}

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((res) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try {
        res(JSON.parse(data || '{}') as Record<string, unknown>);
      } catch {
        res({});
      }
    });
    req.on('error', () => res({}));
  });
}

const sendJson = (res: ServerResponse, code: number, obj: unknown) => {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(obj));
};

const str = (v: unknown): string | null => (v == null ? null : String(v));

export function devFeedback(): Plugin {
  return {
    name: 'dev-feedback',
    apply: 'serve',
    async configureServer(server) {
      const dbPath =
        process.env.FEEDBACK_DB ?? resolve(server.config.root, '..', '.dev-data', 'feedback.sqlite');
      let db: DB | null = null;
      try {
        const mod = (await import('better-sqlite3')) as unknown as { default: new (p: string) => DB };
        mkdirSync(dirname(dbPath), { recursive: true });
        db = new mod.default(dbPath);
        db.pragma('journal_mode = WAL');
        db.exec(SCHEMA);
        // Migrate older DBs that predate the screenshot column.
        try {
          db.exec(`ALTER TABLE feedback ADD COLUMN screenshot TEXT`);
        } catch {
          /* column already exists */
        }
        server.config.logger.info(`  ➜  dev-feedback: ${dbPath}`);
      } catch (e) {
        server.config.logger.warn(`dev-feedback disabled (better-sqlite3 unavailable): ${String(e)}`);
      }

      server.middlewares.use('/__dev/feedback', (req, res, next) => {
        if (req.method !== 'POST') return next();
        if (!db) return sendJson(res, 503, { ok: false, error: 'store unavailable' });
        void readJsonBody(req).then((b) => {
          const info = db!
            .prepare(
              `INSERT INTO feedback (kind, message, route, question_id, question_slug, user_agent)
               VALUES (?, ?, ?, ?, ?, ?)`,
            )
            .run(
              str(b.kind) ?? 'note',
              str(b.message),
              str(b.route),
              str(b.questionId),
              str(b.questionSlug),
              str(req.headers['user-agent']),
            );
          const id = Number(info.lastInsertRowid);

          // Persist the screenshot (data URL) as a PNG file next to the DB.
          const shot = b.screenshot;
          if (typeof shot === 'string' && shot.startsWith('data:image')) {
            try {
              const base64 = shot.slice(shot.indexOf(',') + 1);
              const rel = `screenshots/feedback-${id}.png`;
              const abs = join(dirname(dbPath), rel);
              mkdirSync(dirname(abs), { recursive: true });
              writeFileSync(abs, Buffer.from(base64, 'base64'));
              db!.prepare(`UPDATE feedback SET screenshot = ? WHERE id = ?`).run(rel, id);
            } catch (e) {
              server.config.logger.warn(`dev-feedback: screenshot save failed: ${String(e)}`);
            }
          }
          sendJson(res, 200, { ok: true, id });
        });
      });

      server.middlewares.use('/__dev/events', (req, res, next) => {
        if (req.method !== 'POST') return next();
        if (!db) return sendJson(res, 503, { ok: false });
        void readJsonBody(req).then((b) => {
          db!
            .prepare(`INSERT INTO events (type, route, question_id, detail) VALUES (?, ?, ?, ?)`)
            .run(
              str(b.type) ?? 'unknown',
              str(b.route),
              str(b.questionId),
              b.detail == null ? null : JSON.stringify(b.detail),
            );
          sendJson(res, 200, { ok: true });
        });
      });
    },
  };
}
