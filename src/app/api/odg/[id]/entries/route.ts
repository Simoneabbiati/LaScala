import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyLinkedDepts } from "@/lib/linked-depts";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: odgId } = await params;
  const body = await req.json();
  try {
    const member = await prisma.productionMember.findUnique({
      where: { id: body.memberId },
    });
    const characterName = body.characterName !== undefined
      ? (body.characterName || null)
      : (member?.characterName ?? null);

    const entry = await prisma.odgEntry.create({
      data: {
        odgId,
        memberId: body.memberId,
        startTime: body.startTime,
        endTime: body.endTime,
        activity: body.activity,
        locationId: body.locationId || null,
        notes: body.notes,
        characterName,
        sortOrder: body.sortOrder ?? 0,
      },
      include: { member: { include: { person: true } }, location: true },
    });

    if (member) {
      await applyLinkedDepts(prisma, {
        odgId,
        sourceMembers: [member],
        startTime: body.startTime,
        endTime: body.endTime,
        activity: body.activity,
        locationId: body.locationId || null,
        notes: body.notes ?? null,
      });
    }

    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    console.error("[POST /api/odg/[id]/entries]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
