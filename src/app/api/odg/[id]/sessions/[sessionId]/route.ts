import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const { sessionId } = await params;
  const body = await req.json();
  const session = await prisma.odgSession.update({
    where: { id: sessionId },
    data: {
      startTime: body.startTime,
      endTime: body.endTime,
      activity: body.activity,
      locationId: body.locationId || null,
    },
    include: { location: true },
  });
  return NextResponse.json(session);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const { sessionId } = await params;
  await prisma.odgSession.delete({ where: { id: sessionId } });
  return NextResponse.json({ ok: true });
}
