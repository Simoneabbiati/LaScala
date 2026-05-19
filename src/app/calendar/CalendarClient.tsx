"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, FileEdit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Production = {
  id: string; title: string; composer?: string | null;
  startDate?: string | null; endDate?: string | null;
  theatre: { name: string };
  _count: { odgs: number };
};

type Odg = { id: string; date: string; status: string | null; productionId: string };

const MONTHS_IT = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const DAYS_IT = ["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];

const PROD_COLORS = [
  { bg: "bg-blue-100 hover:bg-blue-200",     text: "text-blue-800",    bar: "bg-blue-200",    dot: "bg-blue-500",    chip: "bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100"    },
  { bg: "bg-purple-100 hover:bg-purple-200", text: "text-purple-800",  bar: "bg-purple-200",  dot: "bg-purple-500",  chip: "bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100" },
  { bg: "bg-rose-100 hover:bg-rose-200",     text: "text-rose-800",    bar: "bg-rose-200",    dot: "bg-rose-500",    chip: "bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100"    },
  { bg: "bg-amber-100 hover:bg-amber-200",   text: "text-amber-800",   bar: "bg-amber-200",   dot: "bg-amber-500",   chip: "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"  },
  { bg: "bg-teal-100 hover:bg-teal-200",     text: "text-teal-800",    bar: "bg-teal-200",    dot: "bg-teal-500",    chip: "bg-teal-50 border-teal-200 text-teal-800 hover:bg-teal-100"    },
  { bg: "bg-orange-100 hover:bg-orange-200", text: "text-orange-800",  bar: "bg-orange-200",  dot: "bg-orange-500",  chip: "bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100" },
  { bg: "bg-green-100 hover:bg-green-200",   text: "text-green-800",   bar: "bg-green-200",   dot: "bg-green-500",   chip: "bg-green-50 border-green-200 text-green-800 hover:bg-green-100"  },
  { bg: "bg-cyan-100 hover:bg-cyan-200",     text: "text-cyan-800",    bar: "bg-cyan-200",    dot: "bg-cyan-500",    chip: "bg-cyan-50 border-cyan-200 text-cyan-800 hover:bg-cyan-100"    },
  { bg: "bg-pink-100 hover:bg-pink-200",     text: "text-pink-800",    bar: "bg-pink-200",    dot: "bg-pink-500",    chip: "bg-pink-50 border-pink-200 text-pink-800 hover:bg-pink-100"    },
  { bg: "bg-indigo-100 hover:bg-indigo-200", text: "text-indigo-800",  bar: "bg-indigo-200",  dot: "bg-indigo-500",  chip: "bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-indigo-100" },
];

const MAX_BARS_PER_WEEK = 3;

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export default function CalendarClient({
  initialProductions,
  initialOdgs,
}: {
  initialProductions: Production[];
  initialOdgs: Odg[];
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [hiddenProductions, setHiddenProductions] = useState<Set<string>>(new Set());

  const productions = initialProductions;
  const odgs = initialOdgs;

  const goToToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); };
  const prev = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  const toggleProduction = (id: string) =>
    setHiddenProductions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = getFirstDayOfMonth(year, month);
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayDay = today.getFullYear() === year && today.getMonth() === month ? today.getDate() : null;
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  const productionsWithColor = productions.map((p, i) => ({
    ...p,
    color: PROD_COLORS[i % PROD_COLORS.length],
    startStr: p.startDate ? p.startDate.slice(0, 10) : null,
    endStr: p.endDate ? p.endDate.slice(0, 10) : null,
  }));

  // Only productions currently visible
  const visibleProductions = productionsWithColor.filter((p) => !hiddenProductions.has(p.id));

  const prodColorMap = Object.fromEntries(productionsWithColor.map((p) => [p.id, p.color]));

  const odgByDate = odgs.reduce<Record<string, Odg[]>>((acc, o) => {
    const d = o.date.slice(0, 10);
    (acc[d] ??= []).push(o);
    return acc;
  }, {});

  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthEnd = `${monthStr}-${String(daysInMonth).padStart(2, "0")}`;

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  function getWeekProductions(week: (number | null)[]) {
    return visibleProductions
      .filter((p) => {
        if (!p.startStr) return false;
        const end = p.endStr ?? p.startStr;
        return week.some((day) => {
          if (!day) return false;
          const cellStr = `${monthStr}-${String(day).padStart(2, "0")}`;
          return cellStr >= p.startStr! && cellStr <= end;
        });
      })
      .map((p) => {
        const end = p.endStr ?? p.startStr!;
        let colStart = -1;
        let colSpan = 0;
        week.forEach((day, dayIdx) => {
          if (!day) return;
          const cellStr = `${monthStr}-${String(day).padStart(2, "0")}`;
          if (cellStr >= p.startStr! && cellStr <= end) {
            if (colStart === -1) colStart = dayIdx + 1;
            colSpan++;
          }
        });
        if (colStart === -1) return null;
        const firstActiveDay = week[colStart - 1]!;
        const firstActiveCellStr = `${monthStr}-${String(firstActiveDay).padStart(2, "0")}`;
        const isStart = p.startStr === firstActiveCellStr;
        const isEnd = end <= monthEnd;
        const showLabel = isStart || firstActiveDay === 1;
        return { ...p, colStart, colSpan, isStart, isEnd, showLabel };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);
  }

  const hasProductions = productionsWithColor.some((p) => p.startStr);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Calendario</h1>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className={isCurrentMonth ? "text-muted-foreground" : ""}
          >
            Oggi
          </Button>
          <div className="flex items-center gap-0.5 ml-1">
            <Button variant="outline" size="icon" onClick={prev}><ChevronLeft size={16} /></Button>
            <span className="text-sm font-semibold w-36 text-center tabular-nums">
              {MONTHS_IT[month]} {year}
            </span>
            <Button variant="outline" size="icon" onClick={next}><ChevronRight size={16} /></Button>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <Card className="overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b bg-muted/40">
          {DAYS_IT.map((d) => (
            <div key={d} className="py-2 text-xs font-semibold text-muted-foreground text-center tracking-wide">{d}</div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, weekIdx) => {
          const isLastWeek = weekIdx === weeks.length - 1;
          const weekProds = getWeekProductions(week);
          const visibleBars = weekProds.slice(0, MAX_BARS_PER_WEEK);
          const overflowCount = weekProds.length - MAX_BARS_PER_WEEK;

          return (
            <div key={weekIdx} className={isLastWeek ? "" : "border-b border-border/60"}>
              {/* Day number row */}
              <div className="grid grid-cols-7">
                {week.map((day, dayIdx) => {
                  const isToday = day === todayDay;
                  const dayStr = day ? `${monthStr}-${String(day).padStart(2, "0")}` : null;
                  const dayOdgs = dayStr ? (odgByDate[dayStr] ?? []) : [];
                  const visibleDayOdgs = dayOdgs.filter((o) => !hiddenProductions.has(o.productionId));
                  const firstOdg = visibleDayOdgs[0];

                  return (
                    <div
                      key={dayIdx}
                      className={`min-h-[52px] pt-1.5 pb-1 px-1.5 border-r border-border/60 ${dayIdx === 6 ? "border-r-0" : ""} ${!day ? "bg-muted/20" : ""}`}
                    >
                      {day && (
                        <div className="flex flex-col items-start gap-1">
                          {firstOdg ? (
                            <Link href={`/productions/${firstOdg.productionId}/odg/${firstOdg.id}`}>
                              <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full transition-colors
                                ${isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/60 cursor-pointer"}`}>
                                {day}
                              </span>
                            </Link>
                          ) : (
                            <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
                              ${isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                              {day}
                            </span>
                          )}

                          {visibleDayOdgs.length > 0 && (
                            <div className="flex gap-0.5 pl-0.5">
                              {visibleDayOdgs.map((odg) => {
                                const color = prodColorMap[odg.productionId];
                                const isDef = odg.status === "DEFINITIVO";
                                return (
                                  <span
                                    key={odg.id}
                                    title={isDef ? "ODG definitivo" : "ODG in bozza"}
                                    className={`w-1.5 h-1.5 rounded-full ${color?.dot ?? "bg-blue-500"} ${isDef ? "opacity-100" : "opacity-40"}`}
                                  />
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Production bars — capped at MAX_BARS_PER_WEEK */}
              <div className={`grid grid-cols-7 ${visibleBars.length > 0 ? "pt-0.5 gap-y-0.5" : ""} ${overflowCount > 0 ? "pb-0.5" : visibleBars.length > 0 ? "pb-2" : "pb-3"}`}>
                {visibleBars.map((p) => (
                  <Link
                    key={p.id}
                    href={`/productions/${p.id}`}
                    style={{ gridColumn: `${p.colStart} / span ${p.colSpan}` }}
                    className={`h-5 flex items-center text-xs font-medium transition-colors cursor-pointer overflow-hidden
                      ${p.color.bg} ${p.color.text}
                      ${p.isStart ? "rounded-l-sm pl-1.5" : "pl-1.5"}
                      ${p.isEnd ? "rounded-r-sm pr-1" : "pr-1"}
                    `}
                  >
                    {p.showLabel && (
                      <span className="truncate leading-none">
                        {p.title}
                        <span className="opacity-60 font-normal"> · {p.theatre.name}</span>
                      </span>
                    )}
                  </Link>
                ))}
              </div>

              {/* Overflow indicator */}
              {overflowCount > 0 && (
                <div className="px-2 pb-1.5 text-xs text-muted-foreground">
                  +{overflowCount} {overflowCount === 1 ? "altra" : "altre"}
                </div>
              )}
            </div>
          );
        })}
      </Card>

      {/* Filter chips — single scrollable row, never wraps */}
      {hasProductions && (
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {productionsWithColor.filter((p) => p.startStr).map((p) => {
            const isHidden = hiddenProductions.has(p.id);
            return (
              <button
                key={p.id}
                onClick={() => toggleProduction(p.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border shrink-0 transition-all
                  ${isHidden ? "opacity-35 bg-muted border-border/40 text-muted-foreground line-through" : p.color.chip}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isHidden ? "bg-muted-foreground/40" : p.color.dot}`} />
                {p.title}
                <span className="font-normal opacity-70">· {p.theatre.name}</span>
                {p._count.odgs > 0 && (
                  <span className="flex items-center gap-0.5 opacity-60">
                    <FileEdit size={10} />
                    {p._count.odgs}
                  </span>
                )}
              </button>
            );
          })}

          {/* Dot convention — inline with chips */}
          <div className="flex items-center gap-3 ml-2 pl-2 border-l border-border/40 shrink-0 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-foreground/60 shrink-0" />
              definitivo
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-foreground/25 shrink-0" />
              bozza
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
