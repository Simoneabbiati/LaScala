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

  const productionsWithColor = productions.map((p, i) => ({
    ...p,
    color: PROD_COLORS[i % PROD_COLORS.length],
    startStr: p.startDate ? p.startDate.slice(0, 10) : null,
    endStr: p.endDate ? p.endDate.slice(0, 10) : null,
  }));

  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthEnd = `${monthStr}-${String(daysInMonth).padStart(2, "0")}`;

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  function getWeekProductions(week: (number | null)[]) {
    return productionsWithColor
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

        {/* Weeks */}
        {weeks.map((week, weekIdx) => {
          const isLastWeek = weekIdx === weeks.length - 1;
          const weekProds = getWeekProductions(week);

          return (
            <div key={weekIdx} className={isLastWeek ? "" : "border-b border-border/60"}>
              {/* Day number row */}
              <div className="grid grid-cols-7">
                {week.map((day, dayIdx) => {
                  const isToday = day === todayDay;
                  return (
                    <div
                      key={dayIdx}
                      className={`pt-1.5 px-1.5 border-r border-border/60 ${dayIdx === 6 ? "border-r-0" : ""} ${!day ? "bg-muted/20" : ""}`}
                    >
                      {day && (
                        <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                          {day}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Events — each production is a single element spanning its columns */}
              <div className={`grid grid-cols-7 ${weekProds.length > 0 ? "pt-1 pb-2 gap-y-0.5" : "pb-8"}`}>
                {weekProds.map((p) => (
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
            </div>
          );
        })}
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
