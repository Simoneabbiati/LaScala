import { prisma } from "@/lib/db";
import Link from "next/link";
import { Building2, BookOpen, CalendarDays, FileText } from "lucide-react";

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

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Benvenuto nel gestionale ODG</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <Building2 size={18} className="text-gray-400" />
            <span className="text-sm text-gray-500">Teatri</span>
          </div>
          <span className="text-3xl font-bold">{theatres.length}</span>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen size={18} className="text-gray-400" />
            <span className="text-sm text-gray-500">Produzioni</span>
          </div>
          <span className="text-3xl font-bold">{productions.length}</span>
        </div>
        <Link href="/productions/new" className="bg-gray-900 text-white rounded-xl p-5 flex flex-col justify-between hover:bg-gray-800 transition-colors">
          <FileText size={18} className="text-gray-400" />
          <span className="text-sm font-medium mt-4">+ Nuova produzione</span>
        </Link>
      </div>

      {/* Productions list */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Produzioni recenti</h2>
        <Link href="/productions" className="text-sm text-gray-500 hover:text-gray-900">Vedi tutte →</Link>
      </div>

      {productions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-gray-400">Nessuna produzione ancora.</p>
          <Link href="/productions/new" className="mt-4 inline-block text-sm font-medium text-gray-900 underline">
            Crea la prima produzione
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {productions.map((p) => {
            const lastOdg = p.odgs[0];
            return (
              <Link
                key={p.id}
                href={`/productions/${p.id}`}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-400 transition-colors group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:underline">{p.title}</h3>
                    {p.composer && <p className="text-sm text-gray-500">{p.composer}</p>}
                  </div>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{p.theatre.name}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <CalendarDays size={12} />
                  {lastOdg
                    ? `Ultimo ODG: ${new Date(lastOdg.date).toLocaleDateString("it-IT", { day: "numeric", month: "long" })}`
                    : "Nessun ODG ancora"}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
