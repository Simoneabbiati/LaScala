import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const location = await prisma.location.create({
    data: { name: body.name, theatreId: id },
  });
  return NextResponse.json(location, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: theatreId } = await params;
  const { locationId } = await req.json();
  await prisma.location.delete({ where: { id: locationId, theatreId } });
  return NextResponse.json({ ok: true });
}
