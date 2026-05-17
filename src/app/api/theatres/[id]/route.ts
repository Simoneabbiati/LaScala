import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const theatre = await prisma.theatre.findUnique({
    where: { id },
    include: { locations: { orderBy: { name: "asc" } }, productions: { orderBy: { startDate: "desc" } } },
  });
  if (!theatre) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(theatre);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const theatre = await prisma.theatre.update({
    where: { id },
    data: { name: body.name, city: body.city, logoUrl: body.logoUrl },
  });
  return NextResponse.json(theatre);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.theatre.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
