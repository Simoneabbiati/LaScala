import { prisma } from "@/lib/db";
import CalendarClient from "./CalendarClient";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const [rawProductions, rawOdgs] = await Promise.all([
    prisma.production.findMany({
      select: {
        id: true, title: true, composer: true,
        startDate: true, endDate: true,
        theatre: { select: { name: true } },
        _count: { select: { odgs: true } },
      },
      orderBy: { startDate: "asc" },
    }),
    prisma.odg.findMany({
      select: { id: true, date: true, status: true, productionId: true },
    }),
  ]);

  const productions = rawProductions.map((p) => ({
    ...p,
    composer: p.composer ?? null,
    startDate: p.startDate ? p.startDate.toISOString().slice(0, 10) : null,
    endDate: p.endDate ? p.endDate.toISOString().slice(0, 10) : null,
  }));

  const odgs = rawOdgs.map((o) => ({
    ...o,
    date: o.date.toISOString().slice(0, 10),
    status: o.status ?? null,
  }));

  return <CalendarClient initialProductions={productions} initialOdgs={odgs} />;
}
