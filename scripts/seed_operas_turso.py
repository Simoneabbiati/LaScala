#!/usr/bin/env python3
"""
Seed opera titles + characters into a Turso (libsql) database.

Usage:
    TURSO_URL=libsql://... TURSO_AUTH_TOKEN=... python scripts/seed_operas_turso.py

The script re-uses the Wikidata SPARQL fetch logic from seed_operas.py but
writes to Turso via its HTTP pipeline API instead of local SQLite.

Environment variables:
    TURSO_URL           Your Turso database URL (libsql://... or https://...)
    TURSO_AUTH_TOKEN    Your Turso auth token
"""

import json
import os
import ssl
import time
import urllib.parse
import urllib.request
from urllib.error import HTTPError

SPARQL_URL = "https://query.wikidata.org/sparql"
PAGE_SIZE = 5000

OPERAS_QUERY = """
SELECT DISTINCT ?opera ?operaLabel ?composerLabel WHERE {{
  ?opera wdt:P31 wd:Q58483083 .
  ?opera wdt:P86 ?composer .
  SERVICE wikibase:label {{
    bd:serviceParam wikibase:language "it,en" .
  }}
}}
LIMIT {limit}
OFFSET {offset}
"""

CHARACTERS_QUERY = """
SELECT DISTINCT ?char ?charLabel ?opera ?voiceTypeLabel WHERE {{
  ?char wdt:P1441 ?opera .
  ?char wdt:P412 ?voiceType .
  ?opera wdt:P31 wd:Q58483083 .
  SERVICE wikibase:label {{
    bd:serviceParam wikibase:language "it,en" .
  }}
}}
LIMIT {limit}
OFFSET {offset}
"""


# ── Wikidata helpers ──────────────────────────────────────────────────────────

_ssl_ctx = ssl.create_default_context()
_ssl_ctx.check_hostname = False
_ssl_ctx.verify_mode = ssl.CERT_NONE


def sparql_query(query: str) -> list[dict]:
    params = urllib.parse.urlencode({"query": query, "format": "json"})
    req = urllib.request.Request(
        f"{SPARQL_URL}?{params}",
        headers={
            "Accept": "application/sparql-results+json",
            "User-Agent": "scala-odg-seed/1.0 (opera database builder)",
        },
    )
    with urllib.request.urlopen(req, timeout=120, context=_ssl_ctx) as resp:
        return json.loads(resp.read().decode())["results"]["bindings"]


def fetch_all_pages(query_template: str, label: str) -> list[dict]:
    rows: list[dict] = []
    offset = 0
    while True:
        query = query_template.format(limit=PAGE_SIZE, offset=offset)
        print(f"  {label}: fetching rows {offset}–{offset + PAGE_SIZE}...")
        page = sparql_query(query)
        rows.extend(page)
        if len(page) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
        time.sleep(1)
    return rows


def val(row: dict, key: str) -> str | None:
    return row[key]["value"] if key in row else None


def wikidata_id(uri: str | None) -> str | None:
    if uri and "/entity/" in uri:
        return uri.split("/entity/")[1]
    return None


# ── Turso HTTP API ────────────────────────────────────────────────────────────

def turso_url(base: str) -> str:
    """Normalise libsql:// → https:// for the HTTP pipeline endpoint."""
    return base.replace("libsql://", "https://") + "/v2/pipeline"


def turso_execute(pipeline_url: str, token: str, statements: list[dict]) -> list:
    """Execute a list of {sql, args} statements in one pipeline request."""
    requests = [{"type": "execute", "stmt": s} for s in statements]
    requests.append({"type": "close"})
    body = json.dumps({"requests": requests}).encode()
    req = urllib.request.Request(
        pipeline_url,
        data=body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30, context=_ssl_ctx) as resp:
            return json.loads(resp.read().decode())["results"]
    except HTTPError as e:
        print(f"  HTTP error {e.code}: {e.read().decode()}")
        raise


def batch_execute(pipeline_url: str, token: str, statements: list[dict], batch_size: int = 50):
    """Execute statements in chunks to stay within Turso request limits."""
    for i in range(0, len(statements), batch_size):
        chunk = statements[i : i + batch_size]
        turso_execute(pipeline_url, token, chunk)
        print(f"  Wrote rows {i + len(chunk)}/{len(statements)}", end="\r")
    print()


def make_stmt(sql: str, args: list) -> dict:
    return {
        "sql": sql,
        "args": [{"type": "text", "value": str(v)} if v is not None else {"type": "null"} for v in args],
    }


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    turso_base = os.environ.get("TURSO_URL", "").strip()
    token = os.environ.get("TURSO_AUTH_TOKEN", "").strip()

    if not turso_base or not token:
        print("Error: set TURSO_URL and TURSO_AUTH_TOKEN environment variables.")
        raise SystemExit(1)

    pipeline = turso_url(turso_base)
    print(f"Target: {pipeline}\n")

    # ── Pass 1: operas ────────────────────────────────────────────────────────
    print("=== Pass 1: fetching operas from Wikidata ===")
    opera_rows = fetch_all_pages(OPERAS_QUERY, "operas")
    print(f"Total opera rows: {len(opera_rows)}")

    operas: dict[str, dict] = {}
    for row in opera_rows:
        wid = wikidata_id(val(row, "opera"))
        if wid and wid not in operas:
            operas[wid] = {
                "wikidataId": wid,
                "title": val(row, "operaLabel") or "",
                "composer": val(row, "composerLabel"),
            }
    print(f"Distinct operas: {len(operas)}")

    # ── Pass 2: characters ───────────────────────────────────────────────────
    print("\n=== Pass 2: fetching characters from Wikidata ===")
    char_rows = fetch_all_pages(CHARACTERS_QUERY, "characters")
    print(f"Total character rows: {len(char_rows)}")

    characters: dict[str, list[dict]] = {}
    seen: set[tuple[str, str]] = set()
    for row in char_rows:
        opera_wid = wikidata_id(val(row, "opera"))
        if not opera_wid:
            continue
        name = val(row, "charLabel") or ""
        key = (opera_wid, name)
        if key not in seen:
            seen.add(key)
            characters.setdefault(opera_wid, []).append(
                {"name": name, "voiceType": val(row, "voiceTypeLabel")}
            )
    print(f"Distinct characters: {len(seen)}")

    # ── Write to Turso ────────────────────────────────────────────────────────
    print("\n=== Writing operas to Turso ===")
    opera_stmts = [
        make_stmt(
            """INSERT INTO Opera (id, wikidataId, title, composer, createdAt)
               VALUES (lower(hex(randomblob(9))), ?, ?, ?, datetime('now'))
               ON CONFLICT(wikidataId) DO UPDATE SET
                 title    = excluded.title,
                 composer = excluded.composer""",
            [o["wikidataId"], o["title"], o["composer"]],
        )
        for o in operas.values()
    ]
    batch_execute(pipeline, token, opera_stmts)
    print(f"Operas: {len(opera_stmts)} rows written.")

    # Fetch back the id→wikidataId map
    print("\nFetching opera IDs from Turso...")
    result = turso_execute(
        pipeline, token,
        [{"sql": "SELECT id, wikidataId FROM Opera", "args": []}],
    )
    rows = result[0]["response"]["result"]["rows"]
    wid_to_id = {r[1]["value"]: r[0]["value"] for r in rows}
    print(f"Loaded {len(wid_to_id)} opera IDs.")

    print("\n=== Writing characters to Turso ===")
    qid_pattern_set: set[str] = set()  # detect Q-code names inline
    char_stmts = []
    for opera_wid, chars in characters.items():
        opera_id = wid_to_id.get(opera_wid)
        if not opera_id:
            continue
        for c in chars:
            name = c["name"]
            if not name or (name.startswith("Q") and name[1:].isdigit()):
                continue
            char_stmts.append(
                make_stmt(
                    """INSERT INTO OperaCharacter (id, operaId, name, voiceType)
                       VALUES (lower(hex(randomblob(9))), ?, ?, ?)
                       ON CONFLICT(operaId, name) DO UPDATE SET
                         voiceType = excluded.voiceType""",
                    [opera_id, name, c["voiceType"]],
                )
            )
    batch_execute(pipeline, token, char_stmts)
    print(f"Characters: {len(char_stmts)} rows written.")

    print("\nDone.")


if __name__ == "__main__":
    main()
