import { createClient } from "@libsql/client";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { readFileSync, readdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// The route handler imports `prisma` from `@/lib/db` at module-load time.
// `db.ts` reuses `globalThis.prisma` if present, so we install a proxy here
// (before any route file gets imported) that delegates every call to the
// PrismaClient created by the current `createTestPrisma()` call.
let activeTestPrisma: PrismaClient | null = null;
const prismaProxy: PrismaClient = new Proxy(
  {},
  {
    get(_target, prop) {
      if (!activeTestPrisma) {
        throw new Error(
          "prisma proxy used before createTestPrisma(): set up a test DB first",
        );
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const value = (activeTestPrisma as any)[prop];
      return typeof value === "function" ? value.bind(activeTestPrisma) : value;
    },
  },
) as unknown as PrismaClient;

// Install the proxy as the singleton before `@/lib/db` is first imported.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).prisma = prismaProxy;

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
  activeTestPrisma = prisma;
  return {
    prisma,
    cleanup: () => {
      if (activeTestPrisma === prisma) activeTestPrisma = null;
      rmSync(dir, { recursive: true, force: true });
    },
    dbUrl: url,
  };
}

export async function seedMinimalProduction(prisma: PrismaClient) {
  const theatre = await prisma.theatre.create({ data: { name: "Teatro Test", city: "Milano" } });
  const production = await prisma.production.create({
    data: { title: "Opera Test", theatreId: theatre.id },
  });
  const odg = await prisma.odg.create({
    data: { productionId: production.id, date: new Date("2026-06-01") },
  });
  return { theatre, production, odg };
}
