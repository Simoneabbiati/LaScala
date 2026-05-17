import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL ?? "NOT SET";
  const hasToken = !!process.env.TURSO_AUTH_TOKEN;
  try {
    const count = await prisma.theatre.count();
    return NextResponse.json({ dbUrl: dbUrl.slice(0, 40) + "...", hasToken, count, status: "ok" });
  } catch (e: any) {
    return NextResponse.json({ dbUrl: dbUrl.slice(0, 40) + "...", hasToken, error: e.message, code: e.code }, { status: 500 });
  }
}
