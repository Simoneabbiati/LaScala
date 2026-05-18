import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { memberId } = await params;
  const body = await req.json();

  if (body.personName) {
    const member = await prisma.productionMember.findUnique({
      where: { id: memberId },
      include: { person: true },
    });

    if (member?.personId && member.person) {
      await prisma.person.update({
        where: { id: member.personId },
        data: {
          name: body.personName,
          email: body.email ?? member.person.email,
          phone: body.phone ?? member.person.phone,
        },
      });
    } else {
      // No person yet — create/find one and link it
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
      await prisma.productionMember.update({
        where: { id: memberId },
        data: { personId: person.id },
      });
    }
  }

  const updated = await prisma.productionMember.update({
    where: { id: memberId },
    data: {
      department: body.department,
      roleTitle: body.roleTitle,
      characterName: body.characterName ?? null,
      notes: body.notes ?? null,
    },
    include: { person: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { memberId } = await params;
  await prisma.productionMember.delete({ where: { id: memberId } });
  return NextResponse.json({ ok: true });
}
