import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const departments = await prisma.department.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(departments);
}

export async function POST(req: NextRequest) {
  const { label } = await req.json();
  if (!label?.trim()) {
    return NextResponse.json({ error: "label required" }, { status: 400 });
  }
  const value = label.trim();
  const existing = await prisma.department.findUnique({ where: { value } });
  if (existing) return NextResponse.json(existing);

  const maxOrder = await prisma.department.aggregate({ _max: { sortOrder: true } });
  const dept = await prisma.department.create({
    data: {
      value,
      label: value,
      isCustom: true,
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
    },
  });
  return NextResponse.json(dept, { status: 201 });
}
