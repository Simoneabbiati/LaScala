"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronRight, Plus, Trash2, Users } from "lucide-react";
import { DEPARTMENTS, ACTIVITIES, DEPT_COLOR, DEPT_LABEL } from "@/lib/constants";

type Person = { id: string; name: string };
type Member = {
  id: string;
  department: string;
  roleTitle: string;
  characterName?: string;
  notes?: string;
  person: Person;
};
type Location = { id: string; name: string };
type Theatre = { id: string; name: string; city: string; locations: Location[] };
type Odg = { id: string; date: string; _count?: { entries: number } };
type Production = {
  id: string;
  title: string;
  composer?: string;
  startDate?: string;
  endDate?: string;
  theatre: Theatre;
  members: Member[];
  odgs: Odg[];
};

const DEPT_ORDER = ["TEAM_CREATIVO", "CAST", "ORCHESTRA", "MAESTRI_COLLABORATORI", "AREA_TECNICA"];

export default function ProductionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [production, setProduction] = useState<Production | null>(null);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [memberForm, setMemberForm] = useState({
    personName: "",
    department: "CAST",
    roleTitle: "",
    characterName: "",
    email: "",
    phone: "",
  });
  const [addingOdg, setAddingOdg] = useState(false);
  const [odgDate, setOdgDate] = useState("");

  const load = () =>
    fetch(`/api/productions/${id}`).then((r) => r.json()).then(setProduction);

  useEffect(() => { load(); }, [id]);

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`/api/productions/${id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(memberForm),
    });
    setMemberForm({ personName: "", department: "CAST", roleTitle: "", characterName: "", email: "", phone: "" });
    setShowMemberForm(false);
    load();
  };

  const removeMember = async (memberId: string) => {
    await fetch(`/api/productions/${id}/members/${memberId}`, { method: "DELETE" });
    load();
  };

  const createOdg = async () => {
    if (!odgDate) return;
    const res = await fetch(`/api/productions/${id}/odg`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: odgDate }),
    });
    const odg = await res.json();
    router.push(`/productions/${id}/odg/${odg.id}`);
  };

  if (!production) return <div className="text-gray-400">Caricamento...</div>;

  const membersByDept = DEPT_ORDER.reduce<Record<string, Member[]>>((acc, dept) => {
    acc[dept] = production.members.filter((m) => m.department === dept);
    return acc;
  }, {});

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link href="/productions" className="hover:text-gray-900">Produzioni</Link>
            <ChevronRight size={14} />
            <span>{production.title}</span>
          </div>
          <h1 className="text-2xl font-bold">{production.title}</h1>
          <p className="text-gray-500">
            {production.composer && <span>{production.composer} · </span>}
            {production.theatre.name}, {production.theatre.city}
            {production.startDate && (
              <span className="ml-2 text-gray-400">
                {new Date(production.startDate).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
                {production.endDate && ` → ${new Date(production.endDate).toLocaleDateString("it-IT", { day: "numeric", month: "long" })}`}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Roster — 2/3 width */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2"><Users size={16} /> Roster</h2>
            <button
              onClick={() => setShowMemberForm(!showMemberForm)}
              className="flex items-center gap-1 text-sm border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50"
            >
              <Plus size={14} /> Aggiungi
            </button>
          </div>

          {showMemberForm && (
            <form onSubmit={addMember} className="bg-white border border-gray-200 rounded-xl p-4 mb-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nome *</label>
                  <input
                    required
                    value={memberForm.personName}
                    onChange={(e) => setMemberForm({ ...memberForm, personName: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                    placeholder="Nome e Cognome"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Dipartimento *</label>
                  <select
                    value={memberForm.department}
                    onChange={(e) => setMemberForm({ ...memberForm, department: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Ruolo / Funzione *</label>
                  <input
                    required
                    value={memberForm.roleTitle}
                    onChange={(e) => setMemberForm({ ...memberForm, roleTitle: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                    placeholder="Direttore d'orchestra"
                  />
                </div>
                {memberForm.department === "CAST" && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Personaggio</label>
                    <input
                      value={memberForm.characterName}
                      onChange={(e) => setMemberForm({ ...memberForm, characterName: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                      placeholder="Gulliver"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Email</label>
                  <input
                    type="email"
                    value={memberForm.email}
                    onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Telefono</label>
                  <input
                    value={memberForm.phone}
                    onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-gray-900 text-white px-4 py-1.5 rounded-lg text-sm">
                  Aggiungi
                </button>
                <button type="button" onClick={() => setShowMemberForm(false)} className="text-sm text-gray-500 px-3">
                  Annulla
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {DEPT_ORDER.map((dept) => {
              const members = membersByDept[dept];
              if (!members?.length) return null;
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
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-4 py-2 text-xs text-gray-400 font-medium">Nome</th>
                        <th className="text-left px-4 py-2 text-xs text-gray-400 font-medium">Ruolo</th>
                        {dept === "CAST" && (
                          <th className="text-left px-4 py-2 text-xs text-gray-400 font-medium">Personaggio</th>
                        )}
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((m) => (
                        <tr key={m.id} className="border-b border-gray-50 last:border-0">
                          <td className="px-4 py-2 font-medium">{m.person.name}</td>
                          <td className="px-4 py-2 text-gray-500 italic text-xs">{m.roleTitle}</td>
                          {dept === "CAST" && (
                            <td className="px-4 py-2 text-gray-500 text-xs">{m.characterName ?? "—"}</td>
                          )}
                          <td className="px-2 py-2">
                            <button
                              onClick={() => removeMember(m.id)}
                              className="text-gray-200 hover:text-red-400 transition-colors"
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
            {production.members.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm bg-white rounded-xl border border-gray-200">
                Nessun membro nel roster ancora.
              </div>
            )}
          </div>
        </div>

        {/* ODG list — 1/3 width */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2"><CalendarDays size={16} /> Ordini del Giorno</h2>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-3">
            <p className="text-xs text-gray-500 mb-2">Crea ODG per:</p>
            <div className="flex gap-2">
              <input
                type="date"
                value={odgDate}
                onChange={(e) => setOdgDate(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm flex-1"
              />
              <button
                onClick={createOdg}
                disabled={!odgDate}
                className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-sm disabled:opacity-40"
              >
                Crea
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {production.odgs.map((odg) => (
              <Link
                key={odg.id}
                href={`/productions/${id}/odg/${odg.id}`}
                className="block bg-white rounded-xl border border-gray-200 px-4 py-3 hover:border-gray-400 transition-colors"
              >
                <p className="font-medium text-sm">
                  {new Date(odg.date).toLocaleDateString("it-IT", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </Link>
            ))}
            {production.odgs.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Nessun ODG ancora.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
