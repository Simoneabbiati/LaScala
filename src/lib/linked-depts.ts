import type { PrismaClient, ProductionMember } from "@/generated/prisma/client";

type ApplyArgs = {
  odgId: string;
  sourceMembers: ProductionMember[];
  startTime: string;
  endTime: string;
  activity: string;
  locationId: string | null;
  notes?: string | null;
};

export async function applyLinkedDepts(prisma: PrismaClient, args: ApplyArgs): Promise<void> {
  const { odgId, sourceMembers, startTime, endTime, activity, locationId, notes } = args;
  if (sourceMembers.length === 0) return;

  const sourceDepts = [...new Set(sourceMembers.map((m) => m.department))];
  const productionIds = [...new Set(sourceMembers.map((m) => m.productionId))];
  if (productionIds.length !== 1) {
    throw new Error("applyLinkedDepts: sourceMembers must belong to a single production");
  }
  const productionId = productionIds[0];

  const linkedDepts = await prisma.department.findMany({
    where: { linkedToDept: { in: sourceDepts } },
  });
  if (linkedDepts.length === 0) return;

  const linkedMembers = await prisma.productionMember.findMany({
    where: {
      productionId,
      department: { in: linkedDepts.map((d) => d.value) },
    },
  });
  if (linkedMembers.length === 0) return;

  const existing = await prisma.odgEntry.findMany({
    where: { odgId, memberId: { in: linkedMembers.map((m) => m.id) } },
    select: { memberId: true },
  });
  const already = new Set(existing.map((e) => e.memberId));

  const toCreate = linkedMembers.filter((m) => !already.has(m.id));
  if (toCreate.length === 0) return;

  const currentCount = await prisma.odgEntry.count({ where: { odgId } });
  await prisma.odgEntry.createMany({
    data: toCreate.map((m, i) => ({
      odgId,
      memberId: m.id,
      startTime,
      endTime,
      activity,
      locationId: locationId ?? null,
      notes: notes ?? null,
      characterName: null,
      sortOrder: currentCount + i,
    })),
  });
}
