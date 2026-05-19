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

  return <CalendarClient initialProductions={productions} />;
}
