import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: productionId } = await params;
  const body = await req.json();

  // Upsert person by name
  let person = await prisma.person.findFirst({ where: { name: body.personName } });
  if (!person) {
    person = await prisma.person.create({
      data: { name: body.personName, email: body.email, phone: body.phone },
    });
  }

  const member = await prisma.productionMember.create({
    data: {
      personId: person.id,
      productionId,
      department: body.department,
      roleTitle: body.roleTitle,
      characterName: body.characterName,
      notes: body.notes,
    },
    include: { person: true },
  });
  return NextResponse.json(member, { status: 201 });
}
