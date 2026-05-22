import { describe, it, expect, afterEach } from "vitest";
import { createTestPrisma, seedMinimalProduction } from "../setup";
import { POST as createSession } from "@/app/api/odg/[id]/sessions/route";

function makeReq(body: object): Request {
  return new Request("http://test/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/odg/[id]/sessions auto-population", () => {
  let cleanupFn: () => void;
  afterEach(() => { cleanupFn?.(); });

  it("creates session + entries for an activity preset (roster complete)", async () => {
    const { prisma, cleanup, dbUrl } = await createTestPrisma();
    process.env.DATABASE_URL = dbUrl;
    cleanupFn = () => { cleanup(); delete process.env.DATABASE_URL; };
    try {
      const { production, odg } = await seedMinimalProduction(prisma);
      await prisma.productionMember.createMany({
        data: [
          { productionId: production.id, department: "TEAM_CREATIVO", roleTitle: "Regista" },
          { productionId: production.id, department: "TEAM_CREATIVO", roleTitle: "Assistente alla Regia" },
          { productionId: production.id, department: "CAST", roleTitle: "Soprano", characterName: "Gulliver" },
          { productionId: production.id, department: "MAESTRO_DI_SALA", roleTitle: "Maestro di Sala" },
          { productionId: production.id, department: "MAESTRI_DI_PALCOSCENICO", roleTitle: "Maestri di Palcoscenico" },
        ],
      });

      const res = await createSession(makeReq({
        startTime: "10:00", endTime: "12:00", activity: "Prova di Scena", sortOrder: 0,
      }) as any, { params: Promise.resolve({ id: odg.id }) });
      const json = await res.json();
      expect(res.status).toBe(201);
      expect(json.session).toBeDefined();
      expect(json.createdMembers).toEqual([]);
      expect(json.createdEntries.length).toBe(5);
      const entries = await prisma.odgEntry.findMany({ where: { odgId: odg.id } });
      expect(entries).toHaveLength(5);
      expect(entries.every((e) => e.activity === "Prova di Scena")).toBe(true);
      const sopranoEntry = entries.find((e) => e.characterName === "Gulliver");
      expect(sopranoEntry).toBeDefined();
    } finally {
      await prisma.$disconnect();
    }
  });

  it("creates empty slots in roster when figures are missing", async () => {
    const { prisma, cleanup, dbUrl } = await createTestPrisma();
    process.env.DATABASE_URL = dbUrl;
    cleanupFn = () => { cleanup(); delete process.env.DATABASE_URL; };
    try {
      const { production, odg } = await seedMinimalProduction(prisma);
      const res = await createSession(makeReq({
        startTime: "10:00", endTime: "12:00", activity: "Prova di Scena", sortOrder: 0,
      }) as any, { params: Promise.resolve({ id: odg.id }) });
      const json = await res.json();
      expect(json.createdMembers.length).toBe(5);
      expect(json.createdEntries.length).toBe(5);

      const members = await prisma.productionMember.findMany({ where: { productionId: production.id } });
      expect(members).toHaveLength(5);
      expect(members.every((m) => m.personId === null)).toBe(true);
      const regista = members.find((m) => m.roleTitle === "Regista");
      expect(regista).toBeDefined();
      const maestro = members.find((m) => m.roleTitle === "Maestro di Sala");
      expect(maestro).toBeDefined();
    } finally {
      await prisma.$disconnect();
    }
  });

  it("returns session only when activity has no preset", async () => {
    const { prisma, cleanup, dbUrl } = await createTestPrisma();
    process.env.DATABASE_URL = dbUrl;
    cleanupFn = () => { cleanup(); delete process.env.DATABASE_URL; };
    try {
      const { odg } = await seedMinimalProduction(prisma);
      const res = await createSession(makeReq({
        startTime: "10:00", endTime: "12:00", activity: "ActivityWithoutPreset", sortOrder: 0,
      }) as any, { params: Promise.resolve({ id: odg.id }) });
      const json = await res.json();
      expect(res.status).toBe(201);
      expect(json.session).toBeDefined();
      expect(json.createdMembers).toEqual([]);
      expect(json.createdEntries).toEqual([]);
    } finally {
      await prisma.$disconnect();
    }
  });

  it("dedups entries that already exist for the same (member, time, activity)", async () => {
    const { prisma, cleanup, dbUrl } = await createTestPrisma();
    process.env.DATABASE_URL = dbUrl;
    cleanupFn = () => { cleanup(); delete process.env.DATABASE_URL; };
    try {
      const { production, odg } = await seedMinimalProduction(prisma);
      const regista = await prisma.productionMember.create({
        data: { productionId: production.id, department: "TEAM_CREATIVO", roleTitle: "Regista" },
      });
      await prisma.productionMember.create({
        data: { productionId: production.id, department: "TEAM_CREATIVO", roleTitle: "Assistente alla Regia" },
      });
      await prisma.odgEntry.create({
        data: { odgId: odg.id, memberId: regista.id, startTime: "10:00", endTime: "12:00", activity: "Prova di Scena", sortOrder: 0 },
      });

      const res = await createSession(makeReq({
        startTime: "10:00", endTime: "12:00", activity: "Prova di Scena", sortOrder: 0,
      }) as any, { params: Promise.resolve({ id: odg.id }) });
      await res.json();
      const registaEntries = await prisma.odgEntry.findMany({
        where: { odgId: odg.id, memberId: regista.id },
      });
      expect(registaEntries).toHaveLength(1);
    } finally {
      await prisma.$disconnect();
    }
  });

  it("kind:all expands to every roster member", async () => {
    const { prisma, cleanup, dbUrl } = await createTestPrisma();
    process.env.DATABASE_URL = dbUrl;
    cleanupFn = () => { cleanup(); delete process.env.DATABASE_URL; };
    try {
      const { production, odg } = await seedMinimalProduction(prisma);
      await prisma.productionMember.createMany({
        data: [
          { productionId: production.id, department: "TEAM_CREATIVO", roleTitle: "Regista" },
          { productionId: production.id, department: "CAST", roleTitle: "Soprano" },
          { productionId: production.id, department: "ORCHESTRA", roleTitle: "Orchestra" },
          { productionId: production.id, department: "MACCHINISTI", roleTitle: "Reparto Macchinisti" },
        ],
      });
      const res = await createSession(makeReq({
        startTime: "20:00", endTime: "23:00", activity: "Generale", sortOrder: 0,
      }) as any, { params: Promise.resolve({ id: odg.id }) });
      const json = await res.json();
      expect(json.createdEntries.length).toBe(4);
      expect(json.createdMembers).toEqual([]);
    } finally {
      await prisma.$disconnect();
    }
  });
});
