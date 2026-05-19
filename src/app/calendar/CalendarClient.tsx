"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Production = {
  id: string; title: string; composer?: string | null;
  startDate?: string | null; endDate?: string | null;
  theatre: { name: string };
};

const MONTHS_IT = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const DAYS_IT = ["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];

const PROD_COLORS = [
  { bg: "bg-blue-100 hover:bg-blue-200", text: "text-blue-800", bar: "bg-blue-200" },
  { bg: "bg-purple-100 hover:bg-purple-200", text: "text-purple-800", bar: "bg-purple-200" },
  { bg: "bg-rose-100 hover:bg-rose-200", text: "text-rose-800", bar: "bg-rose-200" },
  { bg: "bg-amber-100 hover:bg-amber-200", text: "text-amber-800", bar: "bg-amber-200" },
  { bg: "bg-teal-100 hover:bg-teal-200", text: "text-teal-800", bar: "bg-teal-200" },
  { bg: "bg-orange-100 hover:bg-orange-200", text: "text-orange-800", bar: "bg-orange-200" },
];

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export default function CalendarClient({ initialProductions }: { initialProductions: Production[] }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const productions = initialProductions;

  const prev = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = getFirstDayOfMonth(year, month);
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayDay = today.getFullYear() === year && today.getMonth() === month ? today.getDate() : null;

  // For each production, compute which days (in this month view) it spans
  const productionsWithColor = productions.map((p, i) => ({
    ...p,
    color: PROD_COLORS[i % PROD_COLORS.length],
    startStr: p.startDate ? p.startDate.slice(0, 10) : null,
    endStr: p.endDate ? p.endDate.slice(0, 10) : null,
  }));

  // For a given day number, get all productions active on that day and their position info
  function getProductionsForDay(day: number) {
    const cellStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return productionsWithColor
      .filter((p) => {
        if (!p.startStr) return false;
        const end = p.endStr ?? p.startStr;
        return cellStr >= p.startStr && cellStr <= end;
      })
      .map((p) => {
        const end = p.endStr ?? p.startStr!;
        const isStart = cellStr === p.startStr || (p.startStr! < `${year}-${String(month + 1).padStart(2, "0")}-01` && day === 1);
        const monthEnd = `${year}-${String(month + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
        const isEnd = cellStr === end || end > monthEnd;
        const showLabel = cellStr === p.startStr || day === 1;
        return { ...p, isStart, isEnd, showLabel };
      });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Calendario</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prev}><ChevronLeft size={16} /></Button>
          <span className="text-sm font-semibold w-36 text-center">{MONTHS_IT[month]} {year}</span>
          <Button variant="outline" size="icon" onClick={next}><ChevronRight size={16} /></Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b bg-muted/40">
          {DAYS_IT.map((d) => (
            <div key={d} className="py-2 text-xs font-semibold text-muted-foreground text-center">{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const isToday = day === todayDay;
            const isLastRow = i >= cells.length - 7;
            const dayProds = day ? getProductionsForDay(day) : [];
            return (
              <div
                key={i}
                className={`min-h-24 p-1.5 border-b border-r border-border/60 ${i % 7 === 6 ? "border-r-0" : ""} ${isLastRow ? "border-b-0" : ""} ${!day ? "bg-muted/20" : ""}`}
              >
                {day && (
                  <>
                    <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                      {day}
                    </span>
                    <div className="space-y-0.5">
                      {dayProds.map((p) => (
                        <Link key={p.id} href={`/productions/${p.id}`}>
                          <div
                            className={`h-5 flex items-center text-xs font-medium transition-colors cursor-pointer
                              ${p.color.bg} ${p.color.text}
                              ${p.isStart ? "rounded-l-sm pl-1.5" : "-ml-1.5 pl-0"}
                              ${p.isEnd ? "rounded-r-sm pr-1" : "-mr-1.5 pr-0"}
                            `}
                          >
                            {p.showLabel && (
                              <span className="truncate leading-none">
                                {p.title}
                                <span className="opacity-60 font-normal"> · {p.theatre.name}</span>
                              </span>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Legend */}
      {productions.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {productionsWithColor.filter((p) => p.startStr).map((p) => (
            <Link key={p.id} href={`/productions/${p.id}`} className="flex items-center gap-1.5 text-sm hover:underline">
              <span className={`w-3 h-3 rounded-sm ${p.color.bar}`} />
              <span>{p.title}</span>
              <span className="text-muted-foreground text-xs">· {p.theatre.name}</span>
              {p.startStr && <span className="text-muted-foreground text-xs">({new Date(p.startStr).getFullYear()})</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
