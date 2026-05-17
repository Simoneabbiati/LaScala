import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "node:path";

const rawUrl =
  process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), "prisma/dev.db")}`;
// Vercel serverless doesn't support WebSockets — convert libsql:// to https://
const dbUrl = rawUrl.replace(/^libsql:\/\//, "https://");

const adapter = new PrismaLibSql({
  url: dbUrl,
  ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
});

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new PrismaClient({ adapter } as any);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
