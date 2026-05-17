"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Odg = {
  id: string; date: string;
  production: { id: string; title: string; theatre: { name: string } };
};

const MONTHS_IT = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const DAYS_IT = ["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [odgs, setOdgs] = useState<Odg[]>([]);

  useEffect(() => {
    fetch("/api/productions")
      .then((r) => r.json())
      .then(async (productions) => {
        const all: Odg[] = [];
        for (const p of productions) {
          const list = await fetch(`/api/productions/${p.id}/odg`).then((r) => r.json());
          all.push(...list.map((o: Odg) => ({ ...o, production: p })));
        }
        setOdgs(all);
      });
  }, []);

  const prev = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = getFirstDayOfMonth(year, month);
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  // pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const odgsByDay: Record<number, Odg[]> = {};
  for (const odg of odgs) {
    const d = new Date(odg.date);
    if (d.getUTCFullYear() === year && d.getUTCMonth() === month) {
      const day = d.getUTCDate();
      if (!odgsByDay[day]) odgsByDay[day] = [];
      odgsByDay[day].push(odg);
    }
  }

  const todayDay = today.getFullYear() === year && today.getMonth() === month ? today.getDate() : null;

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
            const dayOdgs = day ? (odgsByDay[day] ?? []) : [];
            const isToday = day === todayDay;
            const isLastRow = i >= cells.length - 7;
            return (
              <div
                key={i}
                className={`min-h-24 p-2 border-b border-r border-border/60 ${i % 7 === 6 ? "border-r-0" : ""} ${isLastRow ? "border-b-0" : ""} ${!day ? "bg-muted/20" : ""}`}
              >
                {day && (
                  <>
                    <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                      {day}
                    </span>
                    <div className="space-y-1">
                      {dayOdgs.map((odg) => (
                        <Link key={odg.id} href={`/productions/${odg.production.id}/odg/${odg.id}`}>
                          <Badge variant="secondary" className="w-full justify-start text-xs font-normal truncate hover:bg-primary/10 cursor-pointer">
                            {odg.production.title}
                          </Badge>
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
    </div>
  );
}
