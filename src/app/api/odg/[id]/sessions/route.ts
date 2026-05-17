import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: odgId } = await params;
  const body = await req.json();
  const session = await prisma.odgSession.create({
    data: {
      odgId,
      startTime: body.startTime,
      endTime: body.endTime,
      activity: body.activity,
      locationId: body.locationId || null,
      sortOrder: body.sortOrder ?? 0,
    },
    include: { location: true },
  });
  return NextResponse.json(session, { status: 201 });
}
