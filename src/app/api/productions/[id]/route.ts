import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const production = await prisma.production.findUnique({
    where: { id },
    include: {
      theatre: { include: { locations: true } },
      members: { include: { person: true }, orderBy: [{ department: "asc" }, { roleTitle: "asc" }] },
      odgs: { orderBy: { date: "desc" } },
    },
  });
  if (!production) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(production);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const production = await prisma.production.update({
    where: { id },
    data: {
      title: body.title,
      composer: body.composer,
      theatreId: body.theatreId,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
    },
    include: { theatre: true },
  });
  return NextResponse.json(production);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.production.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
