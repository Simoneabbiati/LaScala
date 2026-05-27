import { describe, it, expect, afterEach } from "vitest";
import type { NextRequest } from "next/server";
import { createTestPrisma, seedMinimalProduction } from "../setup";
import { GET, PUT } from "@/app/api/productions/[id]/scheda/route";

function makeGetReq(): NextRequest {
  return new Request("http://test/", { method: "GET" }) as NextRequest;
}
function makePutReq(body: object): NextRequest {
  return new Request("http://test/", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as NextRequest;
}

describe("GET /api/productions/[id]/scheda", () => {
  let cleanupFn: () => void;
  afterEach(() => { cleanupFn?.(); });

  it("returns 404 when production does not exist", async () => {
    const { prisma, cleanup, dbUrl } = await createTestPrisma();
    process.env.DATABASE_URL = dbUrl;
    cleanupFn = () => { cleanup(); delete process.env.DATABASE_URL; };
    try {
      const res = await GET(makeGetReq(), { params: Promise.resolve({ id: "does-not-exist" }) });
      expect(res.status).toBe(404);
    } finally {
      await prisma.$disconnect();
    }
  });

  it("returns empty scheda for a freshly seeded production", async () => {
    const { prisma, cleanup, dbUrl } = await createTestPrisma();
    process.env.DATABASE_URL = dbUrl;
    cleanupFn = () => { cleanup(); delete process.env.DATABASE_URL; };
    try {
      const { production } = await seedMinimalProduction(prisma);
      const res = await GET(makeGetReq(), { params: Promise.resolve({ id: production.id }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({
        plot: null,
        schedaNotes: null,
        acts: [],
        chorusRoles: [],
        interiors: [],
        hazards: [],
      });
    } finally {
      await prisma.$disconnect();
    }
  });
});

describe("PUT /api/productions/[id]/scheda", () => {
  let cleanupFn: () => void;
  afterEach(() => { cleanupFn?.(); });

  const fullPayload = {
    plot: "Una storia di amore e tradimento.",
    schedaNotes: "Ricorda di chiedere il bandolo a Tizio.",
    acts: [
      { title: "Atto I", description: "Chiesa di Sant'Andrea della Valle" },
      { title: "Atto II", description: "Palazzo Farnese" },
    ],
    chorusRoles: [{ name: "Soldati" }, { name: "Popolane" }],
    interiors: [{ name: "Sagrestia" }, { name: "Studio di Cavaradossi" }],
    hazards: [{ name: "Pistola scenica" }, { name: "Fumo Atto III" }],
  };

  it("returns 404 when production does not exist", async () => {
    const { prisma, cleanup, dbUrl } = await createTestPrisma();
    process.env.DATABASE_URL = dbUrl;
    cleanupFn = () => { cleanup(); delete process.env.DATABASE_URL; };
    try {
      const res = await PUT(makePutReq(fullPayload), { params: Promise.resolve({ id: "missing" }) });
      expect(res.status).toBe(404);
    } finally {
      await prisma.$disconnect();
    }
  });

  it("returns 400 on invalid payload", async () => {
    const { prisma, cleanup, dbUrl } = await createTestPrisma();
    process.env.DATABASE_URL = dbUrl;
    cleanupFn = () => { cleanup(); delete process.env.DATABASE_URL; };
    try {
      const { production } = await seedMinimalProduction(prisma);
      const res = await PUT(
        makePutReq({ plot: "x", schedaNotes: null, acts: [{ title: "", description: null }], chorusRoles: [], interiors: [], hazards: [] }),
        { params: Promise.resolve({ id: production.id }) },
      );
      expect(res.status).toBe(400);
    } finally {
      await prisma.$disconnect();
    }
  });

  it("round-trips a full payload via GET", async () => {
    const { prisma, cleanup, dbUrl } = await createTestPrisma();
    process.env.DATABASE_URL = dbUrl;
    cleanupFn = () => { cleanup(); delete process.env.DATABASE_URL; };
    try {
      const { production } = await seedMinimalProduction(prisma);
      const putRes = await PUT(makePutReq(fullPayload), { params: Promise.resolve({ id: production.id }) });
      expect(putRes.status).toBe(200);

      const getRes = await GET(makeGetReq(), { params: Promise.resolve({ id: production.id }) });
      const json = await getRes.json();
      expect(json.plot).toBe(fullPayload.plot);
      expect(json.schedaNotes).toBe(fullPayload.schedaNotes);
      expect(json.acts.map((a: { title: string; description: string | null }) => ({ title: a.title, description: a.description })))
        .toEqual(fullPayload.acts);
      expect(json.chorusRoles.map((c: { name: string }) => ({ name: c.name }))).toEqual(fullPayload.chorusRoles);
      expect(json.interiors.map((c: { name: string }) => ({ name: c.name }))).toEqual(fullPayload.interiors);
      expect(json.hazards.map((c: { name: string }) => ({ name: c.name }))).toEqual(fullPayload.hazards);
    } finally {
      await prisma.$disconnect();
    }
  });

  it("replace-all: second PUT removes items not in the new payload", async () => {
    const { prisma, cleanup, dbUrl } = await createTestPrisma();
    process.env.DATABASE_URL = dbUrl;
    cleanupFn = () => { cleanup(); delete process.env.DATABASE_URL; };
    try {
      const { production } = await seedMinimalProduction(prisma);
      await PUT(makePutReq(fullPayload), { params: Promise.resolve({ id: production.id }) });
      const shrunk = {
        plot: null, schedaNotes: null,
        acts: [{ title: "Atto unico", description: null }],
        chorusRoles: [], interiors: [], hazards: [],
      };
      await PUT(makePutReq(shrunk), { params: Promise.resolve({ id: production.id }) });

      const acts = await prisma.productionAct.findMany({ where: { productionId: production.id } });
      const chorus = await prisma.productionChorusRole.findMany({ where: { productionId: production.id } });
      expect(acts).toHaveLength(1);
      expect(acts[0].title).toBe("Atto unico");
      expect(chorus).toHaveLength(0);
    } finally {
      await prisma.$disconnect();
    }
  });

  it("preserves order via sortOrder", async () => {
    const { prisma, cleanup, dbUrl } = await createTestPrisma();
    process.env.DATABASE_URL = dbUrl;
    cleanupFn = () => { cleanup(); delete process.env.DATABASE_URL; };
    try {
      const { production } = await seedMinimalProduction(prisma);
      await PUT(makePutReq({
        ...fullPayload,
        hazards: [{ name: "Z" }, { name: "A" }, { name: "M" }],
      }), { params: Promise.resolve({ id: production.id }) });

      const res = await GET(makeGetReq(), { params: Promise.resolve({ id: production.id }) });
      const json = await res.json();
      expect(json.hazards.map((h: { name: string }) => h.name)).toEqual(["Z", "A", "M"]);
    } finally {
      await prisma.$disconnect();
    }
  });

  it("re-fetch after save returns the persisted shape (non-null)", async () => {
    const { prisma, cleanup, dbUrl } = await createTestPrisma();
    process.env.DATABASE_URL = dbUrl;
    cleanupFn = () => { cleanup(); delete process.env.DATABASE_URL; };
    try {
      const { production } = await seedMinimalProduction(prisma);
      const res = await PUT(makePutReq(fullPayload), { params: Promise.resolve({ id: production.id }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).not.toBeNull();
      expect(json.plot).toBe(fullPayload.plot);
    } finally {
      await prisma.$disconnect();
    }
  });
});
