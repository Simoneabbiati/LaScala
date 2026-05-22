import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVITY_PRESETS } from "@/lib/activity-presets";
import { expandPreset } from "@/lib/preset-expansion";
import { applyLinkedDepts } from "@/lib/linked-depts";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: odgId } = await params;
  const body = await req.json();
  try {
    const odg = await prisma.odg.findUnique({ where: { id: odgId } });
    if (!odg) return NextResponse.json({ error: "ODG not found" }, { status: 404 });

    const result = await prisma.$transaction(async (tx) => {
      const session = await tx.odgSession.create({
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

      const preset = ACTIVITY_PRESETS[body.activity as string];
      if (!preset || preset.length === 0) {
        return { session, createdMembers: [], createdEntries: [] };
      }

      const [existingMembers, departments] = await Promise.all([
        tx.productionMember.findMany({ where: { productionId: odg.productionId } }),
        tx.department.findMany(),
      ]);

      const expansion = expandPreset(preset, existingMembers, departments);

      const createdMembers: Array<{ id: string; department: string; roleTitle: string; required: boolean }> = [];
      for (const slot of expansion.membersToCreate) {
        const m = await tx.productionMember.create({
          data: {
            productionId: odg.productionId,
            department: slot.department,
            roleTitle: slot.roleTitle,
            personId: null,
          },
        });
        createdMembers.push({
          id: m.id,
          department: m.department,
          roleTitle: m.roleTitle,
          required: slot.required,
        });
        expansion.includedMemberIds.push(m.id);
        expansion.requiredById[m.id] = slot.required;
      }

      const includedMembers = expansion.includedMemberIds.length > 0
        ? await tx.productionMember.findMany({
            where: { id: { in: expansion.includedMemberIds } },
          })
        : [];

      const existingEntries = await tx.odgEntry.findMany({
        where: {
          odgId,
          memberId: { in: includedMembers.map((m) => m.id) },
          startTime: body.startTime,
          endTime: body.endTime,
          activity: body.activity,
        },
        select: { memberId: true },
      });
      const skip = new Set(existingEntries.map((e) => e.memberId));
      const toEnter = includedMembers.filter((m) => !skip.has(m.id));

      const currentCount = await tx.odgEntry.count({ where: { odgId } });
      const entryData = toEnter.map((m, i) => ({
        odgId,
        memberId: m.id,
        startTime: body.startTime,
        endTime: body.endTime,
        activity: body.activity,
        locationId: body.locationId || null,
        notes: null,
        characterName: m.characterName ?? null,
        sortOrder: currentCount + i,
      }));
      if (entryData.length > 0) {
        await tx.odgEntry.createMany({ data: entryData });
      }

      await applyLinkedDepts(tx as unknown as typeof prisma, {
        odgId,
        sourceMembers: toEnter,
        startTime: body.startTime,
        endTime: body.endTime,
        activity: body.activity,
        locationId: body.locationId || null,
      });

      const created = await tx.odgEntry.findMany({
        where: {
          odgId,
          memberId: { in: toEnter.map((m) => m.id) },
          startTime: body.startTime,
          endTime: body.endTime,
          activity: body.activity,
        },
        include: { member: true },
      });

      const createdEntries = created.map((e) => ({
        id: e.id,
        memberId: e.memberId,
        roleTitle: e.member.roleTitle,
        required: expansion.requiredById[e.memberId] ?? true,
      }));

      return { session, createdMembers, createdEntries };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("[POST /api/odg/[id]/sessions]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
