import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const odg = await prisma.odg.findUnique({
    where: { id },
    include: {
      production: { include: { theatre: { include: { locations: true } } } },
      sessions: { include: { location: true }, orderBy: { sortOrder: "asc" } },
      entries: {
        include: { member: { include: { person: true } }, location: true },
        orderBy: [{ member: { department: "asc" } }, { sortOrder: "asc" }],
      },
    },
  });
  if (!odg) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(odg);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const odg = await prisma.odg.update({
    where: { id },
    data: { notes: body.notes },
  });
  return NextResponse.json(odg);
}
