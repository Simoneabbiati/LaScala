"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, CalendarDays, Plus, Users } from "lucide-react";

type Theatre = { id: string; name: string; city: string };
type Production = {
  id: string;
  title: string;
  composer?: string;
  startDate?: string;
  endDate?: string;
  theatre: Theatre;
  _count: { members: number; odgs: number };
};

export default function ProductionsPage() {
  const [productions, setProductions] = useState<Production[]>([]);

  useEffect(() => {
    fetch("/api/productions").then((r) => r.json()).then(setProductions);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Produzioni</h1>
          <p className="text-gray-500 mt-1">Tutte le produzioni attive e passate</p>
        </div>
        <Link
          href="/productions/new"
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800"
        >
          <Plus size={16} /> Nuova produzione
        </Link>
      </div>

      {productions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <BookOpen size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Nessuna produzione ancora.</p>
          <Link href="/productions/new" className="mt-4 inline-block text-sm font-medium text-gray-900 underline">
            Crea la prima produzione
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {productions.map((p) => (
            <Link
              key={p.id}
              href={`/productions/${p.id}`}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-400 transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="font-bold text-gray-900 group-hover:underline">{p.title}</h2>
                  {p.composer && <p className="text-sm text-gray-500">{p.composer}</p>}
                </div>
                <span className="shrink-0 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {p.theatre.name}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Users size={11} /> {p._count.members} artisti
                </span>
                <span className="flex items-center gap-1">
                  <CalendarDays size={11} /> {p._count.odgs} ODG
                </span>
                {p.startDate && (
                  <span>
                    {new Date(p.startDate).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })}
                    {p.endDate && ` → ${new Date(p.endDate).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}`}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
