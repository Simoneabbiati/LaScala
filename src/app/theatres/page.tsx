"use client";
import { useEffect, useState } from "react";
import { Building2, MapPin, Plus, Trash2 } from "lucide-react";

type Location = { id: string; name: string };
type Theatre = {
  id: string;
  name: string;
  city: string;
  logoUrl?: string;
  locations: Location[];
  _count: { productions: number };
};

export default function TheatresPage() {
  const [theatres, setTheatres] = useState<Theatre[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", city: "" });
  const [locationForms, setLocationForms] = useState<Record<string, string>>({});

  const load = () =>
    fetch("/api/theatres").then((r) => r.json()).then(setTheatres);

  useEffect(() => { load(); }, []);

  const createTheatre = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/theatres", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ name: "", city: "" });
    setShowForm(false);
    load();
  };

  const deleteTheatre = async (id: string) => {
    if (!confirm("Eliminare questo teatro e tutte le produzioni collegate?")) return;
    await fetch(`/api/theatres/${id}`, { method: "DELETE" });
    load();
  };

  const addLocation = async (theatreId: string) => {
    const name = locationForms[theatreId]?.trim();
    if (!name) return;
    await fetch(`/api/theatres/${theatreId}/locations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setLocationForms((prev) => ({ ...prev, [theatreId]: "" }));
    load();
  };

  const deleteLocation = async (theatreId: string, locationId: string) => {
    await fetch(`/api/theatres/${theatreId}/locations`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId }),
    });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Teatri</h1>
          <p className="text-gray-500 mt-1">Gestisci teatri e le loro sale</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800"
        >
          <Plus size={16} /> Nuovo teatro
        </button>
      </div>

      {showForm && (
        <form onSubmit={createTheatre} className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <h2 className="font-semibold mb-4">Nuovo teatro</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Nome teatro *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="Teatro alla Scala"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Città *</label>
              <input
                required
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="Milano"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium">
              Crea
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-500 px-4 py-2">
              Annulla
            </button>
          </div>
        </form>
      )}

      {theatres.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
          Nessun teatro ancora. Aggiungine uno.
        </div>
      ) : (
        <div className="space-y-4">
          {theatres.map((t) => (
            <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Building2 size={20} className="text-gray-400" />
                  <div>
                    <h2 className="font-semibold text-gray-900">{t.name}</h2>
                    <p className="text-sm text-gray-500">{t.city} · {t._count.productions} produzioni</p>
                  </div>
                </div>
                <button onClick={() => deleteTheatre(t.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Sale / Luoghi</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {t.locations.map((loc) => (
                    <span
                      key={loc.id}
                      className="flex items-center gap-1.5 bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full"
                    >
                      <MapPin size={11} />
                      {loc.name}
                      <button
                        onClick={() => deleteLocation(t.id, loc.id)}
                        className="ml-1 text-gray-400 hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={locationForms[t.id] ?? ""}
                    onChange={(e) =>
                      setLocationForms((prev) => ({ ...prev, [t.id]: e.target.value }))
                    }
                    onKeyDown={(e) => e.key === "Enter" && addLocation(t.id)}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-48"
                    placeholder="Nuova sala..."
                  />
                  <button
                    onClick={() => addLocation(t.id)}
                    className="text-sm text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50"
                  >
                    + Aggiungi sala
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
