import { prisma } from "@/lib/db";
import Link from "next/link";
import { Building2, CalendarDays, CheckCircle2, Clock, Plus, Timer } from "lucide-react";
import ProductionCard from "@/components/ProductionCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const [allProductions, theatreCount] = await Promise.all([
    prisma.production.findMany({
      include: { theatre: true, odgs: { orderBy: { date: "desc" }, take: 1 } },
      orderBy: { startDate: "desc" },
    }),
    prisma.theatre.count(),
  ]);

  const inCorso = allProductions.filter((p) => {
    if (!p.startDate || !p.endDate) return false;
    return new Date(p.startDate) <= today && new Date(p.endDate) >= today;
  });

  const inArrivo = allProductions.filter((p) => {
    if (!p.startDate) return false;
    return new Date(p.startDate) > today;
  });

  const concluse = allProductions.filter((p) => {
    if (!p.endDate) return false;
    return new Date(p.endDate) < today;
  });

  const recent = allProductions.slice(0, 6);

  const stats = [
    {
      label: "Teatri in repertorio",
      value: theatreCount,
      icon: Building2,
      sub: "sedi registrate",
    },
    {
      label: "In scena oggi",
      value: inCorso.length,
      icon: Timer,
      sub: inCorso.length === 1 ? inCorso[0].title : inCorso.length > 1 ? inCorso.map(p => p.title).join(", ") : "nessuna produzione attiva",
      highlight: inCorso.length > 0,
    },
    {
      label: "Produzioni future",
      value: inArrivo.length,
      icon: CalendarDays,
      sub: inArrivo.length > 0
        ? `prossima: ${new Date(inArrivo[inArrivo.length - 1].startDate!).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}`
        : "nessuna in programma",
    },
    {
      label: "Produzioni concluse",
      value: concluse.length,
      icon: CheckCircle2,
      sub: "archivio",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {today.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <Link href="/productions/new" className={cn(buttonVariants())}>
          <Plus size={16} /> Nuova produzione
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className={s.highlight ? "border-warning-border bg-warning/40" : ""}>
            <CardHeader className="flex flex-row items-center justify-between pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{s.label}</CardTitle>
              <s.icon size={15} className={s.highlight ? "text-warning-foreground" : "text-muted-foreground"} />
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold mb-1 ${s.highlight ? "text-warning-foreground" : ""}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground truncate">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Produzioni recenti</h2>
          <Link href="/productions" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>Vedi tutte →</Link>
        </div>

        {recent.length === 0 ? (
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
            {recent.map((p) => (
              <ProductionCard
                key={p.id}
                id={p.id}
                title={p.title}
                composer={p.composer}
                theatreName={p.theatre.name}
                startDate={p.startDate}
                endDate={p.endDate}
                lastOdgDate={p.odgs[0]?.date}
                isActive={!!(p.startDate && p.endDate && new Date(p.startDate) <= today && new Date(p.endDate) >= today)}
                isFuture={!!(p.startDate && new Date(p.startDate) > today)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
