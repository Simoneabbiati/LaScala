import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const operas = await prisma.opera.findMany({
    where: { title: { contains: q } },
    include: {
      characters: {
        orderBy: { name: "asc" },
      },
    },
    orderBy: { title: "asc" },
    take: 8,
  });

  type OperaWithChars = (typeof operas)[number];
  const lower = q.toLowerCase();
  operas.sort((a: OperaWithChars, b: OperaWithChars) => {
    const aStarts = a.title.toLowerCase().startsWith(lower) ? 0 : 1;
    const bStarts = b.title.toLowerCase().startsWith(lower) ? 0 : 1;
    return aStarts - bStarts || a.title.localeCompare(b.title);
  });

  const qidPattern = /^Q\d+$/;
  const result = operas.slice(0, 5).map((o) => ({
    ...o,
    characters: o.characters.filter((c) => !qidPattern.test(c.name)),
  }));

  return NextResponse.json(result);
}
