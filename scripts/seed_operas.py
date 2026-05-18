#!/usr/bin/env python3
"""
Fetch opera titles + characters + voice types from Wikidata SPARQL
and insert them into the local SQLite database (prisma/dev.db).

Two-pass approach to avoid SPARQL timeouts:
  1. Fetch all dramatico-musical works with a composer (= operas)
  2. Fetch all characters with voice types linked to those works
"""

import json
import sqlite3
import ssl
import time
import urllib.parse
import urllib.request
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "prisma" / "dev.db"
SPARQL_URL = "https://query.wikidata.org/sparql"
PAGE_SIZE = 5000

# Q58483083 = dramatico-musical work (covers opera, operetta, etc.)
# P86 = composer, P31 = instance of
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

# P1441 = present in work, P412 = voice type
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


def sparql_query(query: str) -> list[dict]:
    params = urllib.parse.urlencode({"query": query, "format": "json"})
    url = f"{SPARQL_URL}?{params}"
    req = urllib.request.Request(
        url,
        headers={
            "Accept": "application/sparql-results+json",
            "User-Agent": "scala-odg-seed/1.0 (opera database builder)",
        },
    )
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    with urllib.request.urlopen(req, timeout=120, context=ctx) as resp:
        data = json.loads(resp.read().decode())
    return data["results"]["bindings"]


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
        time.sleep(1)  # be polite to Wikidata
    return rows


def val(row: dict, key: str) -> str | None:
    return row[key]["value"] if key in row else None


def wikidata_id(uri: str | None) -> str | None:
    if uri and "/entity/" in uri:
        return uri.split("/entity/")[1]
    return None


def main():
    print("=== Pass 1: fetching operas ===")
    opera_rows = fetch_all_pages(OPERAS_QUERY, "operas")
    print(f"Total opera rows: {len(opera_rows)}")

    # Keep first composer seen per opera
    operas: dict[str, dict] = {}
    for row in opera_rows:
        wid = wikidata_id(val(row, "opera"))
        if not wid:
            continue
        if wid not in operas:
            operas[wid] = {
                "wikidataId": wid,
                "title": val(row, "operaLabel") or "",
                "composer": val(row, "composerLabel"),
            }
    print(f"Distinct operas: {len(operas)}")

    print("\n=== Pass 2: fetching operatic roles ===")
    char_rows = fetch_all_pages(CHARACTERS_QUERY, "characters")
    print(f"Total character rows: {len(char_rows)}")

    # Group by (opera_wid, char_name) — take first voice type
    characters: dict[str, list[dict]] = {}
    seen_chars: set[tuple[str, str]] = set()
    for row in char_rows:
        opera_wid = wikidata_id(val(row, "opera"))
        if not opera_wid:
            continue
        name = val(row, "charLabel") or ""
        voice = val(row, "voiceTypeLabel")
        key = (opera_wid, name)
        if key not in seen_chars:
            seen_chars.add(key)
            characters.setdefault(opera_wid, []).append(
                {"name": name, "voiceType": voice}
            )
    print(f"Distinct characters: {len(seen_chars)}")

    print("\n=== Writing to SQLite ===")
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()

    inserted_operas = 0
    inserted_chars = 0

    for opera in operas.values():
        cur.execute(
            """
            INSERT INTO Opera (id, wikidataId, title, composer, createdAt)
            VALUES (lower(hex(randomblob(9))), ?, ?, ?, datetime('now'))
            ON CONFLICT(wikidataId) DO UPDATE SET
              title    = excluded.title,
              composer = excluded.composer
            """,
            (opera["wikidataId"], opera["title"], opera["composer"]),
        )
        inserted_operas += 1

        cur.execute(
            "SELECT id FROM Opera WHERE wikidataId = ?",
            (opera["wikidataId"],),
        )
        opera_id = cur.fetchone()[0]

        for char in characters.get(opera["wikidataId"], []):
            if not char["name"]:
                continue
            cur.execute(
                """
                INSERT INTO OperaCharacter (id, operaId, name, voiceType)
                VALUES (lower(hex(randomblob(9))), ?, ?, ?)
                ON CONFLICT(operaId, name) DO UPDATE SET
                  voiceType = excluded.voiceType
                """,
                (opera_id, char["name"], char["voiceType"]),
            )
            inserted_chars += 1

    con.commit()
    con.close()

    print(
        f"Done. Inserted/updated {inserted_operas} operas "
        f"and {inserted_chars} characters."
    )


if __name__ == "__main__":
    main()
