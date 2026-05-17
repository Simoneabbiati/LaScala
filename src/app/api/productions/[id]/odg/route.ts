import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: productionId } = await params;
  const odgs = await prisma.odg.findMany({
    where: { productionId },
    include: { sessions: true, _count: { select: { entries: true } } },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(odgs);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: productionId } = await params;
  const body = await req.json();
  const date = new Date(body.date);
  date.setUTCHours(0, 0, 0, 0);

  const odg = await prisma.odg.upsert({
    where: { productionId_date: { productionId, date } },
    create: { productionId, date, notes: body.notes },
    update: { notes: body.notes },
    include: {
      sessions: { include: { location: true }, orderBy: { sortOrder: "asc" } },
      entries: {
        include: { member: { include: { person: true } }, location: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  return NextResponse.json(odg, { status: 201 });
}
