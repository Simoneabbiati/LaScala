import { describe, it, expect, afterEach } from "vitest";
import { createTestPrisma, seedMinimalProduction } from "../setup";
import { applyLinkedDepts } from "@/lib/linked-depts";

describe("applyLinkedDepts", () => {
  let cleanupFn: () => void;
  afterEach(() => { cleanupFn?.(); });

  it("creates entries for linked maestro when choir entry is added", async () => {
    const { prisma, cleanup } = await createTestPrisma();
    cleanupFn = cleanup;
    try {
      const { production, odg } = await seedMinimalProduction(prisma);

      // Synthetic linked-dept pair (the real maestro-coro depts were removed in migration
      // 20260526180000; the linkedToDept mechanism itself still exists for any future use).
      await prisma.department.create({
        data: { value: "LINKED_TEST_MAESTRO", label: "Test Linked Maestro", color: "#000000", sortOrder: 999, linkedToDept: "ARTISTI_CORO_UOMINI" },
      });

      const coroMember = await prisma.productionMember.create({
        data: { productionId: production.id, department: "ARTISTI_CORO_UOMINI", roleTitle: "Artisti del Coro (Uomini)" },
      });
      const maestroMember = await prisma.productionMember.create({
        data: { productionId: production.id, department: "LINKED_TEST_MAESTRO", roleTitle: "Test Linked Maestro" },
      });

      await prisma.odgEntry.create({
        data: { odgId: odg.id, memberId: coroMember.id, startTime: "10:00", endTime: "12:00", activity: "Prova Italiana", sortOrder: 0 },
      });

      await applyLinkedDepts(prisma, {
        odgId: odg.id,
        sourceMembers: [coroMember],
        startTime: "10:00",
        endTime: "12:00",
        activity: "Prova Italiana",
        locationId: null,
      });

      const entries = await prisma.odgEntry.findMany({ where: { odgId: odg.id } });
      const maestroEntry = entries.find((e) => e.memberId === maestroMember.id);
      expect(maestroEntry).toBeDefined();
      expect(maestroEntry?.activity).toBe("Prova Italiana");
    } finally {
      await prisma.$disconnect();
    }
  });

  it("does not duplicate linked entries that already exist", async () => {
    const { prisma, cleanup } = await createTestPrisma();
    cleanupFn = cleanup;
    try {
      const { production, odg } = await seedMinimalProduction(prisma);
      await prisma.department.create({
        data: { value: "LINKED_TEST_MAESTRO", label: "Test Linked Maestro", color: "#000000", sortOrder: 999, linkedToDept: "ARTISTI_CORO_UOMINI" },
      });
      const coroMember = await prisma.productionMember.create({
        data: { productionId: production.id, department: "ARTISTI_CORO_UOMINI", roleTitle: "Artisti del Coro (Uomini)" },
      });
      const maestroMember = await prisma.productionMember.create({
        data: { productionId: production.id, department: "LINKED_TEST_MAESTRO", roleTitle: "Test Linked Maestro" },
      });
      await prisma.odgEntry.createMany({
        data: [
          { odgId: odg.id, memberId: coroMember.id, startTime: "10:00", endTime: "12:00", activity: "Prova Italiana", sortOrder: 0 },
          { odgId: odg.id, memberId: maestroMember.id, startTime: "10:00", endTime: "12:00", activity: "Prova Italiana", sortOrder: 1 },
        ],
      });
      await applyLinkedDepts(prisma, {
        odgId: odg.id,
        sourceMembers: [coroMember],
        startTime: "10:00",
        endTime: "12:00",
        activity: "Prova Italiana",
        locationId: null,
      });
      const maestroEntries = await prisma.odgEntry.findMany({
        where: { odgId: odg.id, memberId: maestroMember.id },
      });
      expect(maestroEntries).toHaveLength(1);
    } finally {
      await prisma.$disconnect();
    }
  });

  it("does nothing when source department has no linked dept", async () => {
    const { prisma, cleanup } = await createTestPrisma();
    cleanupFn = cleanup;
    try {
      const { production, odg } = await seedMinimalProduction(prisma);
      const member = await prisma.productionMember.create({
        data: { productionId: production.id, department: "MACCHINISTI", roleTitle: "Reparto Macchinisti" },
      });
      await prisma.odgEntry.create({
        data: { odgId: odg.id, memberId: member.id, startTime: "10:00", endTime: "12:00", activity: "Prova Tecnica", sortOrder: 0 },
      });
      await applyLinkedDepts(prisma, {
        odgId: odg.id,
        sourceMembers: [member],
        startTime: "10:00",
        endTime: "12:00",
        activity: "Prova Tecnica",
        locationId: null,
      });
      const entries = await prisma.odgEntry.findMany({ where: { odgId: odg.id } });
      expect(entries).toHaveLength(1);
    } finally {
      await prisma.$disconnect();
    }
  });
});
