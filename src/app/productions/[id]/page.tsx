"use client";
import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronRight, Pencil, Plus, Trash2, Users, X, Check } from "lucide-react";
import { DEPARTMENTS, DEPT_COLOR, DEPT_LABEL } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import ConfirmDialog from "@/components/ConfirmDialog";

type Person = { id: string; name: string; email?: string; phone?: string };
type Member = { id: string; department: string; roleTitle: string; characterName?: string; notes?: string; person: Person | null };
type Location = { id: string; name: string };
type Theatre = { id: string; name: string; city: string; locations: Location[] };
type TheatreOption = { id: string; name: string; city: string };
type Odg = { id: string; date: string; status?: string | null };
type Production = { id: string; title: string; composer?: string; startDate?: string; endDate?: string; theatre: Theatre; members: Member[]; odgs: Odg[] };

const DEPT_ORDER = ["TEAM_CREATIVO", "CAST", "ORCHESTRA", "MAESTRI_COLLABORATORI", "AREA_TECNICA"];

type EditState = { memberId: string; personName: string; department: string; roleTitle: string; characterName: string; email: string; phone: string };
type ConfirmState = { open: boolean; title: string; description: string; onConfirm: () => void };

const defaultConfirm: ConfirmState = { open: false, title: "", description: "", onConfirm: () => {} };

export default function ProductionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [production, setProduction] = useState<Production | null>(null);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [memberForm, setMemberForm] = useState({ personName: "", department: "CAST", roleTitle: "", characterName: "", email: "", phone: "" });
  const [editState, setEditState] = useState<EditState | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(defaultConfirm);
  const [showProdEdit, setShowProdEdit] = useState(false);
  const [prodEditForm, setProdEditForm] = useState({ title: "", composer: "", theatreId: "", startDate: "", endDate: "" });
  const [theatreOptions, setTheatreOptions] = useState<TheatreOption[]>([]);

  const load = () => fetch(`/api/productions/${id}`).then((r) => r.json()).then(setProduction);
  useEffect(() => { load(); }, [id]);

  const openProdEdit = async () => {
    if (!production) return;
    if (theatreOptions.length === 0) {
      const ts = await fetch("/api/theatres").then((r) => r.json());
      setTheatreOptions(ts);
    }
    setProdEditForm({
      title: production.title,
      composer: production.composer ?? "",
      theatreId: production.theatre.id,
      startDate: production.startDate ? production.startDate.slice(0, 10) : "",
      endDate: production.endDate ? production.endDate.slice(0, 10) : "",
    });
    setShowProdEdit(true);
  };

  const saveProdEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`/api/productions/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prodEditForm),
    });
    setShowProdEdit(false);
    load();
  };

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`/api/productions/${id}/members`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(memberForm),
    });
    setMemberForm({ personName: "", department: "CAST", roleTitle: "", characterName: "", email: "", phone: "" });
    setShowMemberForm(false);
    load();
  };

  const startEdit = (m: Member) => setEditState({
    memberId: m.id, personName: m.person?.name ?? "", department: m.department,
    roleTitle: m.roleTitle, characterName: m.characterName ?? "", email: m.person?.email ?? "", phone: m.person?.phone ?? "",
  });

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editState) return;
    await fetch(`/api/productions/${id}/members/${editState.memberId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editState),
    });
    setEditState(null);
    load();
  };

  const removeMember = (m: Member) => setConfirm({
    open: true,
    title: "Rimuovere dal roster?",
    description: `Rimuovere ${m.person?.name ?? m.characterName ?? "questo membro"} dalla produzione?`,
    onConfirm: async () => {
      await fetch(`/api/productions/${id}/members/${m.id}`, { method: "DELETE" });
      setConfirm(defaultConfirm);
      load();
    },
  });

  const deleteOdg = (odg: Odg) => {
    const dateLabel = new Date(odg.date).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    setConfirm({
      open: true,
      title: "Eliminare ODG?",
      description: `Eliminare l'ODG del ${dateLabel}? Questa azione è irreversibile.`,
      onConfirm: async () => {
        await fetch(`/api/odg/${odg.id}`, { method: "DELETE" });
        setConfirm(defaultConfirm);
        load();
      },
    });
  };

  if (!production) return <div className="text-muted-foreground">Caricamento...</div>;

  const membersByDept = DEPT_ORDER.reduce<Record<string, Member[]>>((acc, dept) => {
    acc[dept] = production.members.filter((m) => m.department === dept);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <ConfirmDialog
        {...confirm}
        destructive
        confirmLabel="Elimina"
        onCancel={() => setConfirm(defaultConfirm)}
      />

      {/* Header */}
      <div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
          <Link href="/productions" className="hover:text-foreground">Produzioni</Link>
          <ChevronRight size={14} />
          <span>{production.title}</span>
        </div>
        {showProdEdit ? (
          <form onSubmit={saveProdEdit} className="space-y-3 border rounded-xl p-4 bg-muted/20">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Titolo *</label>
                <Input required value={prodEditForm.title} onChange={(e) => setProdEditForm({ ...prodEditForm, title: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Compositore</label>
                <Input value={prodEditForm.composer} onChange={(e) => setProdEditForm({ ...prodEditForm, composer: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Teatro *</label>
                <select required value={prodEditForm.theatreId} onChange={(e) => setProdEditForm({ ...prodEditForm, theatreId: e.target.value })}>
                  <option value="">Seleziona teatro...</option>
                  {theatreOptions.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.city}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Inizio</label>
                  <Input type="date" value={prodEditForm.startDate} onChange={(e) => setProdEditForm({ ...prodEditForm, startDate: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Fine</label>
                  <Input type="date" value={prodEditForm.endDate} onChange={(e) => setProdEditForm({ ...prodEditForm, endDate: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm"><Check size={13} /> Salva</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowProdEdit(false)}><X size={13} /> Annulla</Button>
            </div>
          </form>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <h1 className="text-2xl font-bold tracking-tight">{production.title}</h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                {production.composer && (
                  <span className="font-medium text-foreground/70">{production.composer}</span>
                )}
                {production.composer && <span className="text-border">|</span>}
                <span>{production.theatre.name} · {production.theatre.city}</span>
                {production.startDate && (
                  <>
                    <span className="text-border">|</span>
                    <span>
                      {new Date(production.startDate).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
                      {production.endDate && (
                        <> &rarr; {new Date(production.endDate).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}</>
                      )}
                    </span>
                  </>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" className="shrink-0 mt-1" onClick={openProdEdit}><Pencil size={15} /></Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* ODG column — left 50% */}
        <div className="space-y-4">
          <h2 className="text-base font-bold flex items-center gap-2"><CalendarDays size={16} /> Ordini del Giorno</h2>

          {/* One card per day in production range */}
          {(() => {
            if (!production.startDate || !production.endDate) {
              return <p className="text-sm text-muted-foreground">Imposta date di inizio e fine produzione per vedere i giorni.</p>;
            }
            const start = new Date(production.startDate);
            const end = new Date(production.endDate);
            const days: Date[] = [];
            const cur = new Date(start);
            while (cur <= end) { days.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }

            return (
              <div className="space-y-2">
                {days.map((day) => {
                  const dayStr = day.toISOString().slice(0, 10);
                  const odg = production.odgs.find((o) => o.date.slice(0, 10) === dayStr);
                  const label = day.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });

                  const statusDot = !odg ? null
                    : odg.status === "DEFINITIVO"
                      ? <span className="flex items-center gap-1 text-xs font-medium text-green-600"><Check size={13} className="shrink-0" /> Definitivo</span>
                      : odg.status === "BOZZA"
                        ? <span className="text-xs font-medium text-amber-500">In lavorazione</span>
                        : <span className="text-xs font-medium text-amber-500">Iniziato</span>;

                  if (odg) {
                    return (
                      <div key={dayStr} className="group flex items-center rounded-lg border bg-card hover:bg-accent/30 transition-colors">
                        <Link href={`/productions/${id}/odg/${odg.id}`} className="flex-1 px-4 py-3 flex items-center justify-between">
                          <p className="font-semibold capitalize text-sm">{label}</p>
                          {statusDot}
                        </Link>
                        <Button
                          size="icon" variant="ghost"
                          className="mr-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteOdg(odg)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={dayStr}
                      onClick={async () => {
                        const res = await fetch(`/api/productions/${id}/odg`, {
                          method: "POST", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ date: dayStr }),
                        });
                        const newOdg = await res.json();
                        router.push(`/productions/${id}/odg/${newOdg.id}`);
                      }}
                      className="w-full flex items-center justify-between rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:border-border/80 hover:bg-muted/20 transition-colors cursor-pointer"
                    >
                      <span className="capitalize font-medium">{label}</span>
                      <span className="flex items-center gap-1 text-xs"><Plus size={12} /> Crea ODG</span>
                    </button>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Roster — right 50% */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold flex items-center gap-2"><Users size={16} /> Roster</h2>
            <Button size="sm" variant="outline" onClick={() => setShowMemberForm(!showMemberForm)}>
              <Plus size={14} /> Aggiungi
            </Button>
          </div>

          {showMemberForm && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Nuovo membro</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={addMember} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Nome *</label>
                      <Input required size={1} value={memberForm.personName} onChange={(e) => setMemberForm({ ...memberForm, personName: e.target.value })} placeholder="Nome e Cognome" className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Dipartimento *</label>
                      <select value={memberForm.department} onChange={(e) => setMemberForm({ ...memberForm, department: e.target.value })} className="w-full border border-input rounded-md px-2 py-1.5 text-sm bg-background">
                        {DEPARTMENTS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Ruolo *</label>
                      <Input required value={memberForm.roleTitle} onChange={(e) => setMemberForm({ ...memberForm, roleTitle: e.target.value })} placeholder="Direttore d'orchestra" className="h-8 text-sm" />
                    </div>
                    {memberForm.department === "CAST" && (
                      <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Personaggio</label>
                        <Input value={memberForm.characterName} onChange={(e) => setMemberForm({ ...memberForm, characterName: e.target.value })} placeholder="Gulliver" className="h-8 text-sm" />
                      </div>
                    )}
                    <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Email</label>
                      <Input type="email" value={memberForm.email} onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Telefono</label>
                      <Input value={memberForm.phone} onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })} className="h-8 text-sm" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm">Aggiungi</Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowMemberForm(false)}>Annulla</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <div className="divide-y">
              {production.members.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">Nessun membro ancora.</p>
              )}
              {DEPT_ORDER.flatMap((dept) =>
                (membersByDept[dept] ?? []).map((m) => {
                  const isEditing = editState?.memberId === m.id;

                  if (isEditing && editState) {
                    return (
                      <div key={m.id} className="p-3 space-y-2 bg-muted/40">
                        <Input value={editState.personName} onChange={(e) => setEditState({ ...editState, personName: e.target.value })} placeholder="Nome" className="text-sm" />
                        <select value={editState.department} onChange={(e) => setEditState({ ...editState, department: e.target.value })} className="w-full border border-input rounded px-2 py-1.5 text-sm bg-background">
                          {DEPARTMENTS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                        </select>
                        <Input value={editState.roleTitle} onChange={(e) => setEditState({ ...editState, roleTitle: e.target.value })} placeholder="Ruolo" className="text-sm" />
                        <Input value={editState.characterName} onChange={(e) => setEditState({ ...editState, characterName: e.target.value })} placeholder="Personaggio" className="text-sm" />
                        <div className="grid grid-cols-2 gap-2">
                          <Input type="email" value={editState.email} onChange={(e) => setEditState({ ...editState, email: e.target.value })} placeholder="Email" className="text-sm" />
                          <Input value={editState.phone} onChange={(e) => setEditState({ ...editState, phone: e.target.value })} placeholder="Telefono" className="text-sm" />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" className="text-green-600" onClick={saveEdit}><Check size={13} /> Salva</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditState(null)}><X size={13} /> Annulla</Button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={m.id} className="group flex items-center gap-2 px-3 py-2.5 hover:bg-muted/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${!m.person ? "text-muted-foreground italic" : ""}`}>
                          {m.person?.name ?? "— da assegnare"}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <Badge variant="secondary" className="text-xs font-normal px-1.5 py-0.5" style={{ backgroundColor: DEPT_COLOR[m.department] + "44" }}>
                            {DEPT_LABEL[m.department]}
                          </Badge>
                          <span className="text-xs text-muted-foreground italic">{m.roleTitle}</span>
                          {m.characterName && (
                            <span className="text-xs text-foreground/70 truncate">· {m.characterName}</span>
                          )}
                        </div>
                        {(m.person?.email || m.person?.phone || m.notes) && (
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {m.person?.email && (
                              <a href={`mailto:${m.person.email}`} className="text-xs text-muted-foreground hover:text-primary truncate">{m.person.email}</a>
                            )}
                            {m.person?.phone && (
                              <a href={`tel:${m.person.phone}`} className="text-xs text-muted-foreground hover:text-primary">{m.person.phone}</a>
                            )}
                            {m.notes && (
                              <span className="text-xs text-muted-foreground italic truncate">{m.notes}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button size="icon-sm" variant="ghost" onClick={() => startEdit(m)}><Pencil size={12} /></Button>
                        <Button size="icon-sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => removeMember(m)}><Trash2 size={12} /></Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
