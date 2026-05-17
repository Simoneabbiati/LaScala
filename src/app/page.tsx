import { prisma } from "@/lib/db";
import Link from "next/link";
import { Building2, BookOpen, CalendarDays, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [productions, theatres] = await Promise.all([
    prisma.production.findMany({
      include: { theatre: true, odgs: { orderBy: { date: "desc" }, take: 1 } },
      orderBy: { startDate: "desc" },
      take: 6,
    }),
    prisma.theatre.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Benvenuto nel gestionale ODG</p>
        </div>
        <Link href="/productions/new" className={cn(buttonVariants())}>
          <Plus size={16} /> Nuova produzione
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Teatri</CardTitle>
            <Building2 size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-3xl font-bold">{theatres.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Produzioni</CardTitle>
            <BookOpen size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-3xl font-bold">{productions.length}</p></CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Produzioni recenti</h2>
          <Link href="/productions" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>Vedi tutte →</Link>
        </div>

        {productions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Nessuna produzione ancora.</p>
              <Link href="/productions/new" className={cn(buttonVariants({ variant: "link" }), "mt-2")}>
                Crea la prima produzione
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {productions.map((p) => {
              const lastOdg = p.odgs[0];
              return (
                <Card key={p.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="pt-4">
                    <Link href={`/productions/${p.id}`} className="block group">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold group-hover:underline">{p.title}</h3>
                          {p.composer && <p className="text-sm text-muted-foreground">{p.composer}</p>}
                        </div>
                        <Badge variant="secondary">{p.theatre.name}</Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarDays size={11} />
                        {lastOdg
                          ? `Ultimo ODG: ${new Date(lastOdg.date).toLocaleDateString("it-IT", { day: "numeric", month: "long" })}`
                          : "Nessun ODG ancora"}
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
