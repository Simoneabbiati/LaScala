import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";

const getCachedTheatres = unstable_cache(
  () => prisma.theatre.findMany({
    include: {
      locations: true,
      _count: { select: { productions: true } },
      productions: { orderBy: { startDate: "desc" }, take: 50, select: { id: true, title: true, composer: true, startDate: true, endDate: true } },
    },
    orderBy: { name: "asc" },
  }),
  ["theatres"],
  { tags: ["theatres"], revalidate: 300 }
);

export async function GET() {
  const theatres = await getCachedTheatres();
  return NextResponse.json(theatres);
}

export async function POST(req: NextRequest) {
  const { revalidateTag } = await import("next/cache");
  const body = await req.json();
  const theatre = await prisma.theatre.create({
    data: { name: body.name, city: body.city, logoUrl: body.logoUrl },
  });
  revalidateTag("theatres", {});
  return NextResponse.json(theatre, { status: 201 });
}
