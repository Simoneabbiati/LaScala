import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: productionId } = await params;
  const body = await req.json();

  let personId: string | null = null;

  if (body.personName) {
    let person = await prisma.person.findFirst({
      where: { name: body.personName },
    });
    if (!person) {
      person = await prisma.person.create({
        data: {
          name: body.personName,
          email: body.email,
          phone: body.phone,
        },
      });
    }
    personId = person.id ?? null;
  }

  const member = await prisma.productionMember.create({
    data: {
      personId,
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
