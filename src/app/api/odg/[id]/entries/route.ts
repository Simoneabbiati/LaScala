import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: odgId } = await params;
  const body = await req.json();
  const entry = await prisma.odgEntry.create({
    data: {
      odgId,
      memberId: body.memberId,
      startTime: body.startTime,
      endTime: body.endTime,
      activity: body.activity,
      locationId: body.locationId || null,
      notes: body.notes,
      sortOrder: body.sortOrder ?? 0,
    },
    include: { member: { include: { person: true } }, location: true },
  });
  return NextResponse.json(entry, { status: 201 });
}
