import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const { sessionId } = await params;
  await prisma.odgSession.delete({ where: { id: sessionId } });
  return NextResponse.json({ ok: true });
}
