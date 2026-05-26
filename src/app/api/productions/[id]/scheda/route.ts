import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateSchedaPayload } from "@/lib/scheda";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const production = await prisma.production.findUnique({
    where: { id },
    select: {
      plot: true,
      schedaNotes: true,
      acts: { orderBy: { sortOrder: "asc" }, select: { id: true, title: true, description: true } },
      chorusRoles: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true } },
      interiors: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true } },
      hazards: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true } },
    },
  });
  if (!production) return NextResponse.json({ error: "Production not found" }, { status: 404 });
  return NextResponse.json({
    plot: production.plot,
    schedaNotes: production.schedaNotes,
    acts: production.acts,
    chorusRoles: production.chorusRoles,
    interiors: production.interiors,
    hazards: production.hazards,
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const validation = validateSchedaPayload(raw);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const payload = validation.value;

  try {
    const exists = await prisma.production.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "Production not found" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.production.update({
        where: { id },
        data: { plot: payload.plot, schedaNotes: payload.schedaNotes },
      });
      await tx.productionAct.deleteMany({ where: { productionId: id } });
      await tx.productionChorusRole.deleteMany({ where: { productionId: id } });
      await tx.productionInterior.deleteMany({ where: { productionId: id } });
      await tx.productionHazard.deleteMany({ where: { productionId: id } });
      if (payload.acts.length > 0) {
        await tx.productionAct.createMany({
          data: payload.acts.map((a, i) => ({
            productionId: id, title: a.title, description: a.description, sortOrder: i,
          })),
        });
      }
      if (payload.chorusRoles.length > 0) {
        await tx.productionChorusRole.createMany({
          data: payload.chorusRoles.map((x, i) => ({ productionId: id, name: x.name, sortOrder: i })),
        });
      }
      if (payload.interiors.length > 0) {
        await tx.productionInterior.createMany({
          data: payload.interiors.map((x, i) => ({ productionId: id, name: x.name, sortOrder: i })),
        });
      }
      if (payload.hazards.length > 0) {
        await tx.productionHazard.createMany({
          data: payload.hazards.map((x, i) => ({ productionId: id, name: x.name, sortOrder: i })),
        });
      }
    });

    const updated = await prisma.production.findUnique({
      where: { id },
      select: {
        plot: true,
        schedaNotes: true,
        acts: { orderBy: { sortOrder: "asc" }, select: { id: true, title: true, description: true } },
        chorusRoles: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true } },
        interiors: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true } },
        hazards: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true } },
      },
    });
    if (!updated) return NextResponse.json({ error: "Production not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    if (typeof err === "object" && err !== null && (err as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Production not found" }, { status: 404 });
    }
    console.error("[PUT /api/productions/[id]/scheda]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
