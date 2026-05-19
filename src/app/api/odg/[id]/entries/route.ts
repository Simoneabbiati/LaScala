import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: odgId } = await params;
  const body = await req.json();
  try {

  const member = await prisma.productionMember.findUnique({
    where: { id: body.memberId },
    include: { production: true },
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

  // Auto-create entries for linked departments (e.g. Maestro del Coro when choir entry is added)
  if (member) {
    const linkedDepts = await prisma.department.findMany({
      where: { linkedToDept: member.department },
    });

    if (linkedDepts.length > 0) {
      const linkedMembers = await prisma.productionMember.findMany({
        where: {
          productionId: member.productionId,
          department: { in: linkedDepts.map((d) => d.value) },
        },
      });

      // Only create if no entry already exists for this maestro on this ODG
      const existingEntries = await prisma.odgEntry.findMany({
        where: { odgId, memberId: { in: linkedMembers.map((m) => m.id) } },
        select: { memberId: true },
      });
      const alreadyAdded = new Set(existingEntries.map((e) => e.memberId));

      const currentCount = await prisma.odgEntry.count({ where: { odgId } });
      const toCreate = linkedMembers.filter((m) => !alreadyAdded.has(m.id));

      if (toCreate.length > 0) {
        await prisma.odgEntry.createMany({
          data: toCreate.map((m, i) => ({
            odgId,
            memberId: m.id,
            startTime: body.startTime,
            endTime: body.endTime,
            activity: body.activity,
            locationId: body.locationId || null,
            notes: body.notes || null,
            characterName: null,
            sortOrder: currentCount + i,
          })),
        });
      }
    }
  }

  return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    console.error("[POST /api/odg/[id]/entries]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
