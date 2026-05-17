"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Theatre = { id: string; name: string; city: string };

export default function NewProductionPage() {
  const router = useRouter();
  const [theatres, setTheatres] = useState<Theatre[]>([]);
  const [form, setForm] = useState({
    title: "",
    composer: "",
    theatreId: "",
    startDate: "",
    endDate: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/theatres").then((r) => r.json()).then(setTheatres);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/productions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const production = await res.json();
    router.push(`/productions/${production.id}`);
  };

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Nuova produzione</h1>
        <p className="text-gray-500 mt-1">Inserisci i dati dell&apos;opera</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Titolo *</label>
          <input
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            placeholder="I Viaggi di Gulliver"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Compositore / Autore</label>
          <input
            value={form.composer}
            onChange={(e) => setForm({ ...form, composer: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            placeholder="B. Moretti"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Teatro *</label>
          {theatres.length === 0 ? (
            <p className="text-sm text-amber-600">
              Nessun teatro disponibile.{" "}
              <a href="/theatres" className="underline">Aggiungine uno prima.</a>
            </p>
          ) : (
            <select
              required
              value={form.theatreId}
              onChange={(e) => setForm({ ...form, theatreId: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Seleziona teatro...</option>
              {theatres.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.city}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data inizio</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data fine</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={loading || !form.theatreId}
            className="bg-gray-900 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {loading ? "Salvataggio..." : "Crea produzione"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-gray-500 px-4 py-2"
          >
            Annulla
          </button>
        </div>
      </form>
    </div>
  );
}
