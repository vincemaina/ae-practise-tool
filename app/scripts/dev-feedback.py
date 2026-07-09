#!/usr/bin/env python3
"""Read/manage the dev feedback + telemetry SQLite DB (written by the Vite
dev-server while the user runs `pnpm dev`). The agent runs this in the container.

Usage:
  python3 scripts/dev-feedback.py list            # open feedback (default)
  python3 scripts/dev-feedback.py all             # all feedback incl. addressed
  python3 scripts/dev-feedback.py events [-n N] [--type T] [--question Q]
  python3 scripts/dev-feedback.py errors [-n N]
  python3 scripts/dev-feedback.py stats
  python3 scripts/dev-feedback.py done <id> [note...]   # mark feedback addressed
"""
import argparse
import json
import os
import sqlite3
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DB = Path(os.environ.get("FEEDBACK_DB", REPO / ".dev-data" / "feedback.sqlite"))


def connect():
    if not DB.exists():
        sys.exit(f"No feedback DB at {DB}\n(Run the app with `pnpm dev` and leave some feedback first.)")
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    return con


def cmd_list(con, args, only_open=True):
    where = "WHERE status='open'" if only_open else ""
    rows = con.execute(f"SELECT * FROM feedback {where} ORDER BY id DESC").fetchall()
    if not rows:
        print("No open feedback 🎉" if only_open else "No feedback yet.")
        return
    for r in rows:
        tag = {"up": "👍", "down": "👎", "note": "📝"}.get(r["kind"], r["kind"])
        status = "" if r["status"] == "open" else f"  [{r['status']}]"
        q = r["question_slug"] or r["route"] or "—"
        print(f"#{r['id']}  {tag}  {q}  ({r['created_at']}){status}")
        if r["message"]:
            print(f"      {r['message']}")
        shot = r["screenshot"] if "screenshot" in r.keys() else None
        if shot:
            print(f"      📷 {(DB.parent / shot)}")
        if r["addressed_note"]:
            print(f"      ↳ addressed: {r['addressed_note']}")


def cmd_events(con, args):
    clauses, params = [], []
    if args.type:
        clauses.append("type = ?")
        params.append(args.type)
    if args.question:
        clauses.append("question_id = ?")
        params.append(args.question)
    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    rows = con.execute(
        f"SELECT * FROM events {where} ORDER BY id DESC LIMIT ?", (*params, args.limit)
    ).fetchall()
    for r in reversed(rows):
        detail = ""
        if r["detail"]:
            try:
                detail = json.dumps(json.loads(r["detail"]), separators=(",", ":"))
            except Exception:
                detail = r["detail"]
        q = f" {r['question_id']}" if r["question_id"] else ""
        print(f"{r['created_at']}  {r['type']:<14}{q}  {detail}")


def cmd_errors(con, args):
    rows = con.execute(
        "SELECT * FROM events WHERE type='error' OR detail LIKE '%\"ok\":false%' "
        "OR detail LIKE '%\"error\"%' ORDER BY id DESC LIMIT ?",
        (args.limit,),
    ).fetchall()
    if not rows:
        print("No errors logged 🎉")
        return
    for r in reversed(rows):
        print(f"{r['created_at']}  {r['type']}  {r['question_id'] or ''}\n    {r['detail']}")


def cmd_stats(con, args):
    fb = con.execute(
        "SELECT status, kind, COUNT(*) n FROM feedback GROUP BY status, kind"
    ).fetchall()
    print("feedback:")
    for r in fb:
        print(f"  {r['status']:<10} {r['kind']:<6} {r['n']}")
    ev = con.execute("SELECT type, COUNT(*) n FROM events GROUP BY type ORDER BY n DESC").fetchall()
    print("events:")
    for r in ev:
        print(f"  {r['type']:<16} {r['n']}")


def cmd_done(con, args):
    note = " ".join(args.note) if args.note else None
    cur = con.execute(
        "UPDATE feedback SET status='addressed', addressed_at=datetime('now'), addressed_note=? "
        "WHERE id=? AND status='open'",
        (note, args.id),
    )
    con.commit()
    if cur.rowcount:
        print(f"Marked feedback #{args.id} as addressed.")
    else:
        print(f"No open feedback with id #{args.id}.")


def main():
    p = argparse.ArgumentParser(description="dev feedback reader")
    sub = p.add_subparsers(dest="cmd")
    sub.add_parser("list")
    sub.add_parser("all")
    e = sub.add_parser("events")
    e.add_argument("-n", "--limit", type=int, default=40)
    e.add_argument("--type")
    e.add_argument("--question")
    er = sub.add_parser("errors")
    er.add_argument("-n", "--limit", type=int, default=20)
    sub.add_parser("stats")
    d = sub.add_parser("done")
    d.add_argument("id", type=int)
    d.add_argument("note", nargs="*")
    args = p.parse_args()

    con = connect()
    cmd = args.cmd or "list"
    if cmd == "list":
        cmd_list(con, args, only_open=True)
    elif cmd == "all":
        cmd_list(con, args, only_open=False)
    elif cmd == "events":
        cmd_events(con, args)
    elif cmd == "errors":
        cmd_errors(con, args)
    elif cmd == "stats":
        cmd_stats(con, args)
    elif cmd == "done":
        cmd_done(con, args)


if __name__ == "__main__":
    main()
