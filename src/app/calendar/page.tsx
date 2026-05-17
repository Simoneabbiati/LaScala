"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Odg = {
  id: string;
  date: string;
  production: { id: string; title: string; theatre: { name: string } };
  _count: { entries: number };
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Mon=0
}

const MONTHS_IT = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

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

  const prev = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const next = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const odgsByDay: Record<number, Odg[]> = {};
  for (const odg of odgs) {
    const d = new Date(odg.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getUTCDate();
      if (!odgsByDay[day]) odgsByDay[day] = [];
      odgsByDay[day].push(odg);
    }
  }

  const todayDay = today.getFullYear() === year && today.getMonth() === month ? today.getDate() : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Calendario</h1>
        <div className="flex items-center gap-3">
          <button onClick={prev} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">
            <ChevronLeft size={16} />
          </button>
          <span className="font-semibold w-36 text-center">{MONTHS_IT[month]} {year}</span>
          <button onClick={next} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((d) => (
            <div key={d} className="px-3 py-2 text-xs font-semibold text-gray-400 text-center">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const dayOdgs = day ? (odgsByDay[day] ?? []) : [];
            const isToday = day === todayDay;
            return (
              <div
                key={i}
                className={`min-h-24 border-b border-r border-gray-100 p-2 last:border-r-0 ${
                  !day ? "bg-gray-50" : ""
                }`}
              >
                {day && (
                  <>
                    <span
                      className={`text-xs font-medium inline-block mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday ? "bg-gray-900 text-white" : "text-gray-500"
                      }`}
                    >
                      {day}
                    </span>
                    <div className="space-y-1">
                      {dayOdgs.map((odg) => (
                        <Link
                          key={odg.id}
                          href={`/productions/${odg.production.id}/odg/${odg.id}`}
                          className="block text-xs bg-blue-50 text-blue-700 rounded px-1.5 py-0.5 hover:bg-blue-100 truncate"
                          title={odg.production.title}
                        >
                          {odg.production.title}
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
