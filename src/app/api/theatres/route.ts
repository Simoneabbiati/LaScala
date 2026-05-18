import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const theatres = await prisma.theatre.findMany({
    include: {
      locations: true,
      _count: { select: { productions: true } },
      productions: { orderBy: { startDate: "desc" }, select: { id: true, title: true, composer: true, startDate: true, endDate: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(theatres);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const theatre = await prisma.theatre.create({
    data: { name: body.name, city: body.city, logoUrl: body.logoUrl },
  });
  return NextResponse.json(theatre, { status: 201 });
}
