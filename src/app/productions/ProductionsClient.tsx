"use client";
import { useState } from "react";
import Link from "next/link";
import { CalendarDays, Search, Users, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import DeleteProductionButton from "@/components/DeleteProductionButton";
import { buttonVariants } from "@/components/ui/button";

export type ProductionItem = {
  id: string;
  title: string;
  composer: string | null;
  theatre: { name: string; city: string };
  startDate: string | null;
  endDate: string | null;
  _count: { members: number; odgs: number };
  status: "active" | "future" | "past";
};

const GROUPS: { key: ProductionItem["status"]; label: string }[] = [
  { key: "active", label: "In scena ora" },
  { key: "future", label: "In programma" },
  { key: "past", label: "Concluse" },
];

const STATUS_VARIANT: Record<ProductionItem["status"], "warning" | "info" | "secondary"> = {
  active: "warning",
  future: "info",
  past: "secondary",
};

const STATUS_LABEL: Record<ProductionItem["status"], string> = {
  active: "In scena",
  future: "In programma",
  past: "Conclusa",
};

const BORDER_CLASS: Record<ProductionItem["status"], string> = {
  active: "border-l-warning-border",
  future: "border-l-info",
  past: "border-l-border",
};

const FILTERS = [
  { key: "all" as const, label: "Tutte" },
  { key: "active" as const, label: "In scena" },
  { key: "future" as const, label: "In programma" },
  { key: "past" as const, label: "Concluse" },
];

export default function ProductionsClient({ productions }: { productions: ProductionItem[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | ProductionItem["status"]>("all");

  const q = search.toLowerCase().trim();

  const filtered = productions.filter((p) => {
    if (filter !== "all" && p.status !== filter) return false;
    if (!q) return true;
    return (
      p.title.toLowerCase().includes(q) ||
      (p.composer ?? "").toLowerCase().includes(q) ||
      p.theatre.name.toLowerCase().includes(q) ||
      p.theatre.city.toLowerCase().includes(q)
    );
  });

  const grouped = GROUPS.map((g) => ({
    ...g,
    items: filtered.filter((p) => p.status === g.key),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca titolo, compositore, teatro…"
            className="pl-8 h-9 text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex gap-1">
          {FILTERS.map((f) => {
            const count = f.key === "all" ? productions.length : productions.filter((p) => p.status === f.key).length;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "px-3 h-9 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5",
                  filter === f.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {f.label}
                <span className={cn("text-xs tabular-nums", filter === f.key ? "opacity-70" : "opacity-50")}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {q ? `Nessun risultato per "${search}"` : "Nessuna produzione in questa categoria."}
            </p>
            {!q && filter === "all" && (
              <Link href="/productions/new" className={cn(buttonVariants({ variant: "link" }), "mt-2")}>
                Crea la prima produzione
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Grouped results */}
      {grouped.map((group) => (
        <div key={group.key} className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            {group.label}
            <span className="ml-2 font-normal normal-case tracking-normal opacity-60">{group.items.length}</span>
          </p>

          {group.items.map((p) => {
            const dateLabel = p.startDate
              ? `${new Date(p.startDate).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })}${
                  p.endDate
                    ? ` → ${new Date(p.endDate).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}`
                    : ""
                }`
              : null;

            return (
              <Card
                key={p.id}
                className={cn(
                  "hover:shadow-sm transition-shadow border-l-[3px]",
                  BORDER_CLASS[p.status]
                )}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <Link href={`/productions/${p.id}`} className="flex-1 min-w-0 group">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h2 className="font-semibold group-hover:underline">{p.title}</h2>
                        {p.composer && (
                          <span className="text-sm text-muted-foreground">{p.composer}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span>{p.theatre.name} · {p.theatre.city}</span>
                        <span className="flex items-center gap-1">
                          <Users size={11} /> {p._count.members} artisti
                        </span>
                        <span className="flex items-center gap-1">
                          <CalendarDays size={11} /> {p._count.odgs} ODG
                        </span>
                        {dateLabel && <span>{dateLabel}</span>}
                      </div>
                    </Link>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={STATUS_VARIANT[p.status]} className="text-xs">
                        {STATUS_LABEL[p.status]}
                      </Badge>
                      <DeleteProductionButton id={p.id} title={p.title} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ))}
    </div>
  );
}
