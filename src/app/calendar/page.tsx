import { prisma } from "@/lib/db";
import CalendarClient from "./CalendarClient";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const productions = await prisma.production.findMany({
    select: {
      id: true, title: true, composer: true,
      startDate: true, endDate: true,
      theatre: { select: { name: true } },
    },
    orderBy: { startDate: "asc" },
  });

  const serialized = productions.map((p) => ({
    ...p,
    composer: p.composer ?? null,
    startDate: p.startDate ? p.startDate.toISOString().slice(0, 10) : null,
    endDate: p.endDate ? p.endDate.toISOString().slice(0, 10) : null,
  }));

  return <CalendarClient initialProductions={serialized} />;
}
