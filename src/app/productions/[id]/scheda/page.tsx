import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import SchedaForm, { type SchedaInitialData, type OperaInfo } from "./SchedaForm";

export default async function SchedaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const production = await prisma.production.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      composer: true,
      plot: true,
      schedaNotes: true,
      acts: { orderBy: { sortOrder: "asc" }, select: { id: true, title: true, description: true } },
      chorusRoles: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true } },
      interiors: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true } },
      hazards: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true } },
      members: {
        where: { department: "CAST" },
        select: { id: true, roleTitle: true, characterName: true },
        orderBy: { roleTitle: "asc" },
      },
    },
  });
  if (!production) notFound();

  const initial: SchedaInitialData = {
    plot: production.plot,
    schedaNotes: production.schedaNotes,
    acts: production.acts,
    chorusRoles: production.chorusRoles,
    interiors: production.interiors,
    hazards: production.hazards,
  };
  const opera: OperaInfo = {
    title: production.title,
    composer: production.composer,
    characters: production.members,
  };

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <div className="mb-6 flex items-center gap-2">
        <Link href={`/productions/${production.id}`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Torna alla produzione
        </Link>
      </div>
      <h1 className="mb-6 text-2xl font-bold">Scheda opera — {production.title}</h1>
      <SchedaForm productionId={production.id} initial={initial} opera={opera} />
    </div>
  );
}
