import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client/web";
import path from "node:path";

const dbUrl = (
  process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), "prisma/dev.db")}`
).replace(/^libsql:\/\//, "https://");

const client = createClient({
  url: dbUrl,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const adapter = new PrismaLibSql(client);

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new PrismaClient({ adapter } as any);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
