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
