import { getTheatres } from "@/lib/queries";
import TheatresClient from "./TheatresClient";

export const dynamic = "force-dynamic";

export default async function TheatresPage() {
  const theatres = await getTheatres();

  return <TheatresClient initialTheatres={theatres} />;
}
