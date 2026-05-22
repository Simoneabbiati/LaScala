import { describe, it, expect } from "vitest";
import { createTestPrisma, seedMinimalProduction } from "./setup";

describe("test infrastructure", () => {
  it("creates a working Prisma client + applies migrations + seeds data", async () => {
    const { prisma, cleanup } = await createTestPrisma();
    try {
      const { theatre, production, odg } = await seedMinimalProduction(prisma);
      expect(theatre.name).toBe("Teatro Test");
      expect(production.title).toBe("Opera Test");
      const departments = await prisma.department.findMany();
      expect(departments.length).toBeGreaterThan(10);
      expect(departments.find((d: any) => d.value === "CAST")).toBeTruthy();
    } finally {
      await prisma.$disconnect();
      cleanup();
    }
  });
});
