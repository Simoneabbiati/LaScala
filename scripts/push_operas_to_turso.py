#!/usr/bin/env python3
"""
Copy Opera + OperaCharacter rows from local prisma/dev.db → Turso.

Usage:
    TURSO_URL=libsql://... TURSO_AUTH_TOKEN=... python scripts/push_operas_to_turso.py
"""

import json
import os
import sqlite3
import ssl
import time
import urllib.request
from pathlib import Path
from urllib.error import HTTPError

DB_PATH = Path(__file__).parent.parent / "prisma" / "dev.db"

_ssl_ctx = ssl.create_default_context()
_ssl_ctx.check_hostname = False
_ssl_ctx.verify_mode = ssl.CERT_NONE


def turso_pipeline_url(base: str) -> str:
    return base.replace("libsql://", "https://") + "/v2/pipeline"


def execute_batch(url: str, token: str, stmts: list[dict]) -> None:
    requests = [{"type": "execute", "stmt": s} for s in stmts]
    requests.append({"type": "close"})
    body = json.dumps({"requests": requests}).encode()
    for attempt in range(5):
        req = urllib.request.Request(
            url,
            data=body,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=60, context=_ssl_ctx) as resp:
                result = json.loads(resp.read().decode())
            for r in result["results"]:
                if r["type"] == "error":
                    raise RuntimeError(r["error"]["message"])
            return
        except HTTPError as e:
            if e.code in (429, 502, 503, 504) and attempt < 4:
                wait = 2 ** attempt
                print(f"\n  HTTP {e.code}, retrying in {wait}s...", flush=True)
                time.sleep(wait)
            else:
                raise RuntimeError(f"HTTP {e.code}: {e.read().decode()}")


def make_stmt(sql: str, args: list) -> dict:
    return {
        "sql": sql,
        "args": [
            {"type": "text", "value": str(v)} if v is not None else {"type": "null"}
            for v in args
        ],
    }


def chunked(lst: list, size: int):
    for i in range(0, len(lst), size):
        yield lst[i : i + size]


def main():
    turso_base = os.environ.get("TURSO_URL", "").strip()
    token = os.environ.get("TURSO_AUTH_TOKEN", "").strip()
    if not turso_base or not token:
        raise SystemExit("Error: set TURSO_URL and TURSO_AUTH_TOKEN")

    if not DB_PATH.exists():
        raise SystemExit(f"Error: local DB not found at {DB_PATH}")

    url = turso_pipeline_url(turso_base)
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()

    # ── Operas ────────────────────────────────────────────────────────────────
    cur.execute("SELECT id, wikidataId, title, composer, createdAt FROM Opera")
    operas = cur.fetchall()
    print(f"Operas to push: {len(operas)}")

    opera_stmts = [
        make_stmt(
            """INSERT INTO Opera (id, wikidataId, title, composer, createdAt)
               VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(wikidataId) DO UPDATE SET
                 title=excluded.title, composer=excluded.composer""",
            list(row),
        )
        for row in operas
    ]

    for i, chunk in enumerate(chunked(opera_stmts, 10)):
        execute_batch(url, token, chunk)
        done = min((i + 1) * 10, len(opera_stmts))
        print(f"  Operas: {done}/{len(opera_stmts)}", end="\r", flush=True)
        time.sleep(0.1)
    print(f"\nOperas done.")

    # ── Characters ───────────────────────────────────────────────────────────
    cur.execute("SELECT id, operaId, name, voiceType FROM OperaCharacter")
    chars = cur.fetchall()
    print(f"Characters to push: {len(chars)}")

    char_stmts = [
        make_stmt(
            """INSERT INTO OperaCharacter (id, operaId, name, voiceType)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(operaId, name) DO UPDATE SET voiceType=excluded.voiceType""",
            list(row),
        )
        for row in chars
    ]

    for i, chunk in enumerate(chunked(char_stmts, 10)):
        execute_batch(url, token, chunk)
        done = min((i + 1) * 10, len(char_stmts))
        print(f"  Characters: {done}/{len(char_stmts)}", end="\r", flush=True)
        time.sleep(0.1)
    print(f"\nCharacters done.")

    con.close()
    print("\nAll done.")


if __name__ == "__main__":
    main()
