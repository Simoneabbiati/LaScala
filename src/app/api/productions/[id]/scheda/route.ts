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
  // Implemented in next task.
  void req; void id; void validateSchedaPayload;
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
