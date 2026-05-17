import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  const { entryId } = await params;
  const body = await req.json();
  const entry = await prisma.odgEntry.update({
    where: { id: entryId },
    data: {
      startTime: body.startTime,
      endTime: body.endTime,
      activity: body.activity,
      locationId: body.locationId || null,
      notes: body.notes,
    },
    include: { member: { include: { person: true } }, location: true },
  });
  return NextResponse.json(entry);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  const { entryId } = await params;
  await prisma.odgEntry.delete({ where: { id: entryId } });
  return NextResponse.json({ ok: true });
}
