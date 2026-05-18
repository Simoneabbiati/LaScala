import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { memberId } = await params;
  const body = await req.json();

  if (body.personName) {
    const current = await prisma.productionMember.findUnique({
      where: { id: memberId },
      include: { person: true },
    });

    const nameUnchanged = current?.person?.name === body.personName;

    if (nameUnchanged && current?.personId) {
      // Same name — only update contact details on the existing person
      await prisma.person.update({
        where: { id: current.personId },
        data: {
          email: body.email ?? current.person?.email,
          phone: body.phone ?? current.person?.phone,
        },
      });
    } else {
      // Name changed (or no person yet) — find/create the target person
      // and re-point this member, leaving the original person untouched
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
