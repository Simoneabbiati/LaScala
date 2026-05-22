import { createClient } from "@libsql/client";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { readFileSync, readdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export async function createTestPrisma() {
  const dir = mkdtempSync(path.join(tmpdir(), "lascala-test-"));
  const dbFile = path.join(dir, "test.db");
  const url = `file:${dbFile}`;

  const direct = createClient({ url });
  const migrationsDir = path.join(__dirname, "..", "prisma", "migrations");
  const folders = readdirSync(migrationsDir)
    .filter((f) => f !== "migration_lock.toml")
    .sort();
  for (const folder of folders) {
    const sqlPath = path.join(migrationsDir, folder, "migration.sql");
    let sql: string;
    try { sql = readFileSync(sqlPath, "utf8"); } catch { continue; }
    const statements = sql.split(";").map((s) => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      try { await direct.execute(stmt); } catch (e) {
        const msg = String((e as Error).message ?? e);
        if (!/already exists/i.test(msg) && !/duplicate column/i.test(msg)) throw e;
      }
    }
  }
  await direct.close();

  const adapter = new PrismaLibSql({ url });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prisma = new PrismaClient({ adapter } as any);
  return { prisma, cleanup: () => { rmSync(dir, { recursive: true, force: true }); } };
}

export async function seedMinimalProduction(prisma: any) {
  const theatre = await prisma.theatre.create({ data: { name: "Teatro Test", city: "Milano" } });
  const production = await prisma.production.create({
    data: { title: "Opera Test", theatreId: theatre.id },
  });
  const odg = await prisma.odg.create({
    data: { productionId: production.id, date: new Date("2026-06-01") },
  });
  return { theatre, production, odg };
}
