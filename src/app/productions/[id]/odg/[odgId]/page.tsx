"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ChevronRight, Plus, Trash2, FileDown } from "lucide-react";
import { ACTIVITIES, DEPT_COLOR, DEPT_LABEL } from "@/lib/constants";

type Location = { id: string; name: string };
type Person = { id: string; name: string };
type Member = { id: string; department: string; roleTitle: string; characterName?: string; person: Person };
type OdgEntry = { id: string; startTime: string; endTime: string; activity: string; location?: Location; notes?: string; member: Member };
type OdgSession = { id: string; startTime: string; endTime: string; activity: string; location?: Location };
type Theatre = { id: string; name: string; city: string; locations: Location[] };
type Production = { id: string; title: string; composer?: string; theatre: Theatre; members: Member[] };
type OdgFull = {
  id: string;
  date: string;
  notes?: string;
  production: Production;
  sessions: OdgSession[];
  entries: OdgEntry[];
};

const DEPT_ORDER = ["TEAM_CREATIVO", "CAST", "ORCHESTRA", "MAESTRI_COLLABORATORI", "AREA_TECNICA"];

const emptySession = () => ({ startTime: "", endTime: "", activity: "", locationId: "" });
const emptyEntry = () => ({ memberId: "", startTime: "", endTime: "", activity: "", locationId: "", notes: "" });

export default function OdgPage({ params }: { params: Promise<{ id: string; odgId: string }> }) {
  const { id: productionId, odgId } = use(params);
  const [odg, setOdg] = useState<OdgFull | null>(null);
  const [sessionForm, setSessionForm] = useState(emptySession());
  const [entryForm, setEntryForm] = useState(emptyEntry());
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);

  const load = () =>
    fetch(`/api/odg/${odgId}`).then((r) => r.json()).then(setOdg);

  useEffect(() => { load(); }, [odgId]);

  const addSession = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`/api/odg/${odgId}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...sessionForm, sortOrder: odg?.sessions.length ?? 0 }),
    });
    setSessionForm(emptySession());
    setShowSessionForm(false);
    load();
  };

  const deleteSession = async (sessionId: string) => {
    await fetch(`/api/odg/${odgId}/sessions/${sessionId}`, { method: "DELETE" });
    load();
  };

  const addEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`/api/odg/${odgId}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...entryForm, sortOrder: odg?.entries.length ?? 0 }),
    });
    setEntryForm(emptyEntry());
    setShowEntryForm(false);
    load();
  };

  const deleteEntry = async (entryId: string) => {
    await fetch(`/api/odg/${odgId}/entries/${entryId}`, { method: "DELETE" });
    load();
  };

  if (!odg) return <div className="text-gray-400">Caricamento...</div>;

  const { production } = odg;
  const locations = production.theatre.locations;
  const dateLabel = new Date(odg.date).toLocaleDateString("it-IT", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const entriesByDept = DEPT_ORDER.reduce<Record<string, OdgEntry[]>>((acc, dept) => {
    acc[dept] = odg.entries.filter((e) => e.member.department === dept);
    return acc;
  }, {});

  return (
    <div>
      {/* Breadcrumb + header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
          <Link href="/productions" className="hover:text-gray-900">Produzioni</Link>
          <ChevronRight size={14} />
          <Link href={`/productions/${productionId}`} className="hover:text-gray-900">{production.title}</Link>
          <ChevronRight size={14} />
          <span>ODG</span>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold capitalize">{dateLabel}</h1>
            <p className="text-gray-500">{production.title} · {production.theatre.name}</p>
          </div>
          <Link
            href={`/api/odg/${odgId}/pdf`}
            target="_blank"
            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800"
          >
            <FileDown size={16} /> Esporta PDF
          </Link>
        </div>
      </div>

      {/* Day overview sessions */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm">Programma del giorno</h2>
          <button
            onClick={() => setShowSessionForm(!showSessionForm)}
            className="text-xs flex items-center gap-1 border border-gray-200 px-2 py-1 rounded-lg hover:bg-gray-50"
          >
            <Plus size={12} /> Aggiungi blocco
          </button>
        </div>

        {odg.sessions.length === 0 && !showSessionForm && (
          <p className="text-sm text-gray-400">Nessun blocco orario nel programma del giorno.</p>
        )}

        <div className="space-y-2 mb-3">
          {odg.sessions.map((s) => (
            <div key={s.id} className="flex items-center gap-3 text-sm group">
              <span className="font-mono text-gray-500 w-28 shrink-0">{s.startTime} – {s.endTime}</span>
              <span>{s.activity}</span>
              {s.location && <span className="text-gray-400 text-xs">({s.location.name})</span>}
              <button
                onClick={() => deleteSession(s.id)}
                className="ml-auto opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        {showSessionForm && (
          <form onSubmit={addSession} className="border border-gray-100 rounded-lg p-3 space-y-2 bg-gray-50">
            <div className="grid grid-cols-5 gap-2">
              <input
                required
                type="time"
                value={sessionForm.startTime}
                onChange={(e) => setSessionForm({ ...sessionForm, startTime: e.target.value })}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
              />
              <input
                required
                type="time"
                value={sessionForm.endTime}
                onChange={(e) => setSessionForm({ ...sessionForm, endTime: e.target.value })}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
              />
              <select
                required
                value={sessionForm.activity}
                onChange={(e) => setSessionForm({ ...sessionForm, activity: e.target.value })}
                className="col-span-2 border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
              >
                <option value="">Attività...</option>
                {ACTIVITIES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <select
                value={sessionForm.locationId}
                onChange={(e) => setSessionForm({ ...sessionForm, locationId: e.target.value })}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
              >
                <option value="">Luogo...</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="bg-gray-900 text-white px-3 py-1 rounded text-xs">Aggiungi</button>
              <button type="button" onClick={() => setShowSessionForm(false)} className="text-xs text-gray-400">Annulla</button>
            </div>
          </form>
        )}
      </div>

      {/* Per-person entries */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Chiamate individuali</h2>
        <button
          onClick={() => setShowEntryForm(!showEntryForm)}
          className="flex items-center gap-1 text-sm border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50"
        >
          <Plus size={14} /> Aggiungi chiamata
        </button>
      </div>

      {showEntryForm && (
        <form onSubmit={addEntry} className="bg-white border border-gray-200 rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-xs text-gray-500 mb-1">Persona *</label>
              <select
                required
                value={entryForm.memberId}
                onChange={(e) => setEntryForm({ ...entryForm, memberId: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
              >
                <option value="">Seleziona...</option>
                {DEPT_ORDER.map((dept) => {
                  const members = production.members.filter((m) => m.department === dept);
                  if (!members.length) return null;
                  return (
                    <optgroup key={dept} label={DEPT_LABEL[dept]}>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.person.name} — {m.roleTitle}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Orario inizio *</label>
              <input
                required
                type="time"
                value={entryForm.startTime}
                onChange={(e) => setEntryForm({ ...entryForm, startTime: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Orario fine *</label>
              <input
                required
                type="time"
                value={entryForm.endTime}
                onChange={(e) => setEntryForm({ ...entryForm, endTime: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Attività *</label>
              <select
                required
                value={entryForm.activity}
                onChange={(e) => setEntryForm({ ...entryForm, activity: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
              >
                <option value="">Seleziona...</option>
                {ACTIVITIES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Luogo</label>
              <select
                value={entryForm.locationId}
                onChange={(e) => setEntryForm({ ...entryForm, locationId: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
              >
                <option value="">—</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Note</label>
              <input
                value={entryForm.notes}
                onChange={(e) => setEntryForm({ ...entryForm, notes: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                placeholder="Note opzionali"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-gray-900 text-white px-4 py-1.5 rounded-lg text-sm">
              Aggiungi
            </button>
            <button type="button" onClick={() => setShowEntryForm(false)} className="text-sm text-gray-400 px-3">
              Annulla
            </button>
          </div>
        </form>
      )}

      {/* Entries grouped by department */}
      <div className="space-y-3">
        {DEPT_ORDER.map((dept) => {
          const entries = entriesByDept[dept];
          if (!entries?.length) return null;
          return (
            <div key={dept} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div
                className="px-4 py-2 text-sm font-semibold text-gray-700"
                style={{ backgroundColor: DEPT_COLOR[dept] + "55" }}
              >
                {DEPT_LABEL[dept]}
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-400">
                    <th className="text-left px-4 py-2 font-medium">Nominativo</th>
                    <th className="text-left px-4 py-2 font-medium">Orario</th>
                    <th className="text-left px-4 py-2 font-medium">Attività</th>
                    <th className="text-left px-4 py-2 font-medium">Luogo</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-gray-50 last:border-0 group">
                      <td className="px-4 py-2">
                        <div className="font-medium">{entry.member.person.name}</div>
                        <div className="text-xs text-gray-400 italic">{entry.member.roleTitle}</div>
                      </td>
                      <td className="px-4 py-2 font-mono text-gray-600">
                        {entry.startTime} – {entry.endTime}
                      </td>
                      <td className="px-4 py-2 text-gray-700">{entry.activity}</td>
                      <td className="px-4 py-2 text-gray-500">{entry.location?.name ?? "—"}</td>
                      <td className="px-2 py-2">
                        <button
                          onClick={() => deleteEntry(entry.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-200 hover:text-red-400 transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
        {odg.entries.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm bg-white rounded-xl border border-gray-200">
            Nessuna chiamata ancora. Aggiungi le presenze per oggi.
          </div>
        )}
      </div>
    </div>
  );
}
