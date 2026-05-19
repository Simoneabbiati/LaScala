import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/db";
import ProductionsClient, { type ProductionItem } from "./ProductionsClient";

export const dynamic = "force-dynamic";

export default async function ProductionsPage() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const raw = await prisma.production.findMany({
    include: { theatre: true, _count: { select: { members: true, odgs: true } } },
    orderBy: { startDate: "desc" },
  });

  const productions: ProductionItem[] = raw.map((p) => ({
    id: p.id,
    title: p.title,
    composer: p.composer,
    theatre: { name: p.theatre.name, city: p.theatre.city },
    startDate: p.startDate ? p.startDate.toISOString() : null,
    endDate: p.endDate ? p.endDate.toISOString() : null,
    _count: p._count,
    status: (() => {
      if (p.startDate && p.endDate && new Date(p.startDate) <= today && new Date(p.endDate) >= today)
        return "active";
      if (p.startDate && new Date(p.startDate) > today) return "future";
      return "past";
    })(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Produzioni</h1>
          <p className="text-muted-foreground mt-0.5">
            {productions.length === 0
              ? "Nessuna produzione"
              : `${productions.length} produzion${productions.length === 1 ? "e" : "i"}`}
          </p>
        </div>
        <Link href="/productions/new" className={cn(buttonVariants())}>
          <Plus size={16} /> Nuova produzione
        </Link>
      </div>

      {productions.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-3">
            <BookOpen size={32} className="text-muted-foreground/40" />
            <p className="text-muted-foreground">Nessuna produzione ancora.</p>
            <Link href="/productions/new" className={cn(buttonVariants({ variant: "link" }))}>
              Crea la prima produzione
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ProductionsClient productions={productions} />
      )}
    </div>
  );
}
