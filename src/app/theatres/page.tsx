import { getTheatres } from "@/lib/queries";
import TheatresClient from "./TheatresClient";

export const dynamic = "force-dynamic";

export default async function TheatresPage() {
  const theatres = (await getTheatres()).map((t) => ({
    ...t,
    productions: t.productions.map((p) => ({
      ...p,
      startDate: p.startDate ? p.startDate.toISOString().slice(0, 10) : null,
      endDate: p.endDate ? p.endDate.toISOString().slice(0, 10) : null,
    })),
  }));

  return <TheatresClient initialTheatres={theatres} />;
}
