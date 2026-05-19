import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const productions = await prisma.production.findMany({
    include: {
      theatre: true,
      _count: { select: { members: true, odgs: true } },
    },
    orderBy: { startDate: "desc" },
    take: 200,
  });
  return NextResponse.json(productions);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const production = await prisma.production.create({
    data: {
      title: body.title,
      composer: body.composer,
      theatreId: body.theatreId,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    },
    include: { theatre: true },
  });
  return NextResponse.json(production, { status: 201 });
}
