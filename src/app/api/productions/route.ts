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
  try {
    const body = await req.json();
    const production = await prisma.production.create({
      data: {
        title: body.title,
        composer: body.composer || null,
        theatreId: body.theatreId,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        stageManagerName: body.stageManagerName || null,
        stageManagerEmail: body.stageManagerEmail || null,
        stageManagerPhone: body.stageManagerPhone || null,
        asstStageManagerName: body.asstStageManagerName || null,
        asstStageManagerEmail: body.asstStageManagerEmail || null,
        asstStageManagerPhone: body.asstStageManagerPhone || null,
      },
      include: { theatre: true },
    });
    return NextResponse.json(production, { status: 201 });
  } catch (err) {
    console.error("[POST /api/productions]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
