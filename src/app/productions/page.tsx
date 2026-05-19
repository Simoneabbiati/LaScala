import Link from "next/link";
import { BookOpen, CalendarDays, Plus, Users } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getProductions } from "@/lib/queries";
import DeleteProductionButton from "@/components/DeleteProductionButton";

export const dynamic = "force-dynamic";

export default async function ProductionsPage() {
  const productions = await getProductions();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Produzioni</h1>
          <p className="text-muted-foreground mt-1">Tutte le produzioni attive e passate</p>
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
        <div className="grid grid-cols-2 gap-4">
          {productions.map((p) => (
            <Card key={p.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between mb-3">
                  <Link href={`/productions/${p.id}`} className="block group flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h2 className="font-bold group-hover:underline">{p.title}</h2>
                        {p.composer && <p className="text-sm text-muted-foreground">{p.composer}</p>}
                      </div>
                      <Badge variant="secondary">{p.theatre.name}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users size={11} /> {p._count.members} artisti</span>
                      <span className="flex items-center gap-1"><CalendarDays size={11} /> {p._count.odgs} ODG</span>
                      {p.startDate && (
                        <span>
                          {new Date(p.startDate).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })}
                          {p.endDate && ` → ${new Date(p.endDate).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}`}
                        </span>
                      )}
                    </div>
                  </Link>
                  <DeleteProductionButton id={p.id} title={p.title} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
