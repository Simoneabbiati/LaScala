#!/usr/bin/env node
// Applies pending SQL migrations to Turso (or local libsql dev.db).
// Usage: node scripts/migrate.js
//   or:  DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... node scripts/migrate.js

import { createClient } from "@libsql/client";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const rawUrl = process.env.DATABASE_URL ?? `file:${join(root, "prisma/dev.db")}`;
const url = rawUrl.trim().replace(/^libsql:\/\//, "https://");
const authToken = process.env.TURSO_AUTH_TOKEN;

const db = createClient({ url, authToken });

// Ensure migrations table exists
await db.execute(`
  CREATE TABLE IF NOT EXISTS _prisma_migrations (
    id                TEXT PRIMARY KEY,
    checksum          TEXT NOT NULL,
    finished_at       DATETIME,
    migration_name    TEXT NOT NULL,
    logs              TEXT,
    rolled_back_at    DATETIME,
    started_at        DATETIME NOT NULL DEFAULT current_timestamp,
    applied_steps_count INTEGER NOT NULL DEFAULT 0
  )
`);

const migrationsDir = join(root, "prisma/migrations");
const folders = readdirSync(migrationsDir)
  .filter((f) => f !== "migration_lock.toml")
  .sort();

let applied = 0;
for (const folder of folders) {
  const sqlPath = join(migrationsDir, folder, "migration.sql");
  let sql;
  try { sql = readFileSync(sqlPath, "utf8"); } catch { continue; }

  const existing = await db.execute({
    sql: "SELECT id FROM _prisma_migrations WHERE migration_name = ?",
    args: [folder],
  });
  if (existing.rows.length > 0) continue;

  console.log(`Applying: ${folder}`);
  const statements = sql.split(";").map((s) => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    try {
      await db.execute(stmt);
    } catch (e) {
      const msg = String(e.message ?? e);
      // Skip if object already exists (idempotent re-runs)
      if (/already exists/i.test(msg) || /duplicate column/i.test(msg)) {
        console.log(`  skip (already exists): ${stmt.slice(0, 60)}...`);
      } else {
        throw e;
      }
    }
  }
  await db.execute({
    sql: "INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, applied_steps_count) VALUES (?, ?, ?, datetime('now'), ?)",
    args: [crypto.randomUUID(), "", folder, statements.length],
  });
  applied++;
}

console.log(applied === 0 ? "No pending migrations." : `Done — ${applied} migration(s) applied.`);
