import { prisma } from "@/lib/db";
import Link from "next/link";
import { Building2, CalendarDays, CheckCircle2, FileEdit, Plus, Timer } from "lucide-react";
import ProductionCard from "@/components/ProductionCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86400000);

  const [allProductions, theatreCount, todayOdgs, draftOdgs] = await Promise.all([
    prisma.production.findMany({
      include: {
        theatre: true,
        odgs: { orderBy: { date: "desc" }, take: 1 },
        _count: { select: { members: true, odgs: true } },
      },
      orderBy: { startDate: "desc" },
    }),
    prisma.theatre.count(),
    prisma.odg.findMany({
      where: { date: { gte: today, lt: tomorrow } },
      select: { id: true, productionId: true, status: true },
    }),
    prisma.odg.findMany({
      where: { status: "BOZZA" },
      include: { production: true },
      orderBy: { date: "asc" },
      take: 8,
    }),
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
  const todayOdgByProdId = Object.fromEntries(todayOdgs.map((o) => [o.productionId, o]));

  const stats = [
    {
      label: "Teatri in repertorio",
      value: theatreCount,
      icon: Building2,
      sub: "sedi registrate",
      href: "/theatres",
    },
    {
      label: "In scena oggi",
      value: inCorso.length,
      icon: Timer,
      sub:
        inCorso.length === 1
          ? inCorso[0].title
          : inCorso.length > 1
            ? `${inCorso.length} produzioni`
            : "nessuna produzione attiva",
      highlight: inCorso.length > 0,
      href:
        inCorso.length === 1
          ? `/productions/${inCorso[0].id}`
          : inCorso.length > 0
            ? "/productions"
            : undefined,
    },
    {
      label: "Produzioni future",
      value: inArrivo.length,
      icon: CalendarDays,
      sub:
        inArrivo.length > 0
          ? `prossima: ${new Date(inArrivo[inArrivo.length - 1].startDate!).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}`
          : "nessuna in programma",
      href: "/productions",
    },
    {
      label: "Produzioni concluse",
      value: concluse.length,
      icon: CheckCircle2,
      sub: "archivio",
      href: "/productions",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-0.5">
            {today.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <Link href="/productions/new" className={cn(buttonVariants())}>
          <Plus size={16} /> Nuova produzione
        </Link>
      </div>

      {/* TODAY — shown only when there are active productions */}
      {inCorso.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Oggi in scena</p>
          <div className={cn("grid gap-3", inCorso.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
            {inCorso.map((prod) => {
              const odg = todayOdgByProdId[prod.id];
              return (
                <div
                  key={prod.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-warning-border bg-warning/20 px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-base leading-tight truncate">{prod.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{prod.theatre.name}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {odg ? (
                      <>
                        <Badge variant={odg.status === "DEFINITIVO" ? "success" : "warning"} className="text-xs">
                          {odg.status === "DEFINITIVO" ? "Definitivo" : "Bozza"}
                        </Badge>
                        <Link
                          href={`/productions/${prod.id}/odg/${odg.id}`}
                          className={cn(buttonVariants({ size: "sm" }))}
                        >
                          Apri ODG
                        </Link>
                      </>
                    ) : (
                      <Link
                        href={`/productions/${prod.id}`}
                        className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                      >
                        <Plus size={14} /> Crea ODG
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STATS */}
      <div className="grid grid-cols-4 gap-3">
        {stats.map((s) => {
          const card = (
            <Card
              className={cn(
                s.highlight ? "border-warning-border bg-warning/40" : "",
                s.href ? "hover:shadow-sm transition-shadow" : ""
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {s.label}
                </CardTitle>
                <s.icon size={15} className={s.highlight ? "text-warning-foreground" : "text-muted-foreground"} />
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold mb-1 ${s.highlight ? "text-warning-foreground" : ""}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground truncate">{s.sub}</p>
              </CardContent>
            </Card>
          );
          return s.href ? (
            <Link key={s.label} href={s.href} className="block">
              {card}
            </Link>
          ) : (
            <div key={s.label}>{card}</div>
          );
        })}
      </div>

      {/* BOTTOM 2-COL */}
      <div className="grid grid-cols-3 gap-6 items-start">
        {/* LEFT: Bozze da finalizzare */}
        <div>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <FileEdit size={14} className="text-muted-foreground" />
            Bozze da finalizzare
            {draftOdgs.length > 0 && (
              <span className="ml-auto text-xs font-normal text-muted-foreground tabular-nums">
                {draftOdgs.length}
              </span>
            )}
          </h2>
          {draftOdgs.length === 0 ? (
            <div className="rounded-lg border border-dashed px-4 py-8 text-center">
              <CheckCircle2 size={20} className="mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Nessuna bozza in sospeso</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {draftOdgs.map((odg) => (
                <Link
                  key={odg.id}
                  href={`/productions/${odg.productionId}/odg/${odg.id}`}
                  className="flex items-center justify-between rounded-lg border px-3 py-2.5 hover:bg-accent/30 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{odg.production.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {new Date(odg.date).toLocaleDateString("it-IT", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                  <Badge variant="warning" className="text-xs shrink-0 ml-2">
                    Bozza
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Recent productions (2/3 width) */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Produzioni recenti</h2>
            <Link href="/productions" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              Vedi tutte →
            </Link>
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
            <div className="grid grid-cols-2 gap-3">
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
                  memberCount={p._count.members}
                  odgCount={p._count.odgs}
                  isActive={!!(
                    p.startDate &&
                    p.endDate &&
                    new Date(p.startDate) <= today &&
                    new Date(p.endDate) >= today
                  )}
                  isFuture={!!(p.startDate && new Date(p.startDate) > today)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
