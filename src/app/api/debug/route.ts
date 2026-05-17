import { NextResponse } from "next/server";
import { createClient } from "@libsql/client/web";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/generated/prisma/client";

export async function GET() {
  const rawUrl = process.env.DATABASE_URL ?? "NOT SET";
  const convertedUrl = rawUrl.replace(/^libsql:\/\//, "https://");
  const hasToken = !!process.env.TURSO_AUTH_TOKEN;

  try {
    const client = createClient({ url: convertedUrl, authToken: process.env.TURSO_AUTH_TOKEN });
    const adapter = new PrismaLibSql(client);
    const p = new PrismaClient({ adapter } as any);
    const count = await p.theatre.count();
    return NextResponse.json({ rawUrl: rawUrl.slice(0, 50), convertedUrl: convertedUrl.slice(0, 50), hasToken, count, status: "ok" });
  } catch (e: any) {
    return NextResponse.json({ rawUrl: rawUrl.slice(0, 50), convertedUrl: convertedUrl.slice(0, 50), hasToken, error: e.message?.slice(0, 200), code: e.code }, { status: 500 });
  }
}
