import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const rawUrl = process.env.DATABASE_URL ?? "NOT SET";
  const convertedUrl = rawUrl.replace(/^libsql:\/\//, "https://");
  const hasToken = !!process.env.TURSO_AUTH_TOKEN;
  try {
    const count = await prisma.theatre.count();
    return NextResponse.json({ convertedUrl: convertedUrl.slice(0, 50), hasToken, count, status: "ok" });
  } catch (e: any) {
    return NextResponse.json({ convertedUrl: convertedUrl.slice(0, 50), hasToken, error: e.message?.slice(0, 200), code: e.code }, { status: 500 });
  }
}
