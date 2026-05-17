import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { memberId } = await params;
  await prisma.productionMember.delete({ where: { id: memberId } });
  return NextResponse.json({ ok: true });
}
