"use client";
import React, { useEffect, useState, use, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronDown, ChevronRight, Pencil, Plus, Search, Trash2, Users, X, Check } from "lucide-react";
import { DEPT_BG, DEPT_LABEL, DEPT_ORDER, TECHNICAL_DEPT_VALUES, EXTRAS_TYPES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ConfirmDialog from "@/components/ConfirmDialog";
import { FormField } from "@/components/ui/form-field";

type Person = { id: string; name: string; email?: string; phone?: string };
type Member = { id: string; department: string; roleTitle: string; characterName?: string; notes?: string; person: Person | null };
type Location = { id: string; name: string };
type Theatre = { id: string; name: string; city: string; locations: Location[] };
type TheatreOption = { id: string; name: string; city: string };
type Odg = { id: string; date: string; status?: string | null };
type Production = { id: string; title: string; composer?: string; startDate?: string; endDate?: string; theatre: Theatre; members: Member[]; odgs: Odg[]; stageManagerName?: string; stageManagerEmail?: string; stageManagerPhone?: string; asstStageManagerName?: string; asstStageManagerEmail?: string; asstStageManagerPhone?: string };


type EditState = { memberId: string; personName: string; department: string; roleTitle: string; characterName: string; email: string; phone: string };
type ConfirmState = { open: boolean; title: string; description: string; onConfirm: () => void };

const defaultConfirm: ConfirmState = { open: false, title: "", description: "", onConfirm: () => {} };

export default function ProductionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [production, setProduction] = useState<Production | null>(null);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [memberForm, setMemberForm] = useState({ personName: "", department: "CAST", customDept: "", roleTitle: "", characterName: "", email: "", phone: "" });
  const [editState, setEditState] = useState<EditState | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(defaultConfirm);
  const [showProdEdit, setShowProdEdit] = useState(false);
  const [prodEditForm, setProdEditForm] = useState({ title: "", composer: "", theatreId: "", startDate: "", endDate: "", stageManagerName: "", stageManagerEmail: "", stageManagerPhone: "", asstStageManagerName: "", asstStageManagerEmail: "", asstStageManagerPhone: "" });
  const [theatreOptions, setTheatreOptions] = useState<TheatreOption[]>([]);
  const [rosterSearch, setRosterSearch] = useState("");
  const [collapsedDepts, setCollapsedDepts] = useState<Set<string>>(new Set());

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
      stageManagerName: production.stageManagerName ?? "",
      stageManagerEmail: production.stageManagerEmail ?? "",
      stageManagerPhone: production.stageManagerPhone ?? "",
      asstStageManagerName: production.asstStageManagerName ?? "",
      asstStageManagerEmail: production.asstStageManagerEmail ?? "",
      asstStageManagerPhone: production.asstStageManagerPhone ?? "",
    });
    setShowProdEdit(true);
  };

  const saveProdEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await fetch(`/api/productions/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prodEditForm),
    });
    setShowProdEdit(false);
    load();
  };

  const addMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const dept = memberForm.department === "__CUSTOM__" ? memberForm.customDept : memberForm.department;
    await fetch(`/api/productions/${id}/members`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...memberForm, department: dept }),
    });
    setMemberForm({ personName: "", department: "CAST", customDept: "", roleTitle: "", characterName: "", email: "", phone: "" });
    setShowMemberForm(false);
    load();
  };

  const startEdit = (m: Member) => setEditState({
    memberId: m.id, personName: m.person?.name ?? "", department: m.department,
    roleTitle: m.roleTitle, characterName: m.characterName ?? "", email: m.person?.email ?? "", phone: m.person?.phone ?? "",
  });

  const saveEdit = async () => {
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

  const toggleCollapsedDept = (dept: string) => setCollapsedDepts((prev) => {
    const next = new Set(prev);
    if (next.has(dept)) next.delete(dept); else next.add(dept);
    return next;
  });

  const productionCustomDepts = production
    ? [...new Set(production.members.map((m) => m.department).filter((d) => !DEPT_ORDER.includes(d)))]
    : [];
  const fullDeptOrder = [...DEPT_ORDER, ...productionCustomDepts];
  const membersByDept = useMemo(() =>
    fullDeptOrder.reduce<Record<string, Member[]>>((acc, dept) => {
      acc[dept] = (production?.members ?? []).filter((m) => m.department === dept);
      return acc;
    }, {}),
  // fullDeptOrder changes identity each render but is derived from production — production is the real dep
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [production]);

  const hasRoster = (production?.members.length ?? 0) > 0;

  const filteredMembersByDept = useMemo(() => {
    const q = rosterSearch.toLowerCase().trim();
    if (!q) return membersByDept;
    return fullDeptOrder.reduce<Record<string, Member[]>>((acc, dept) => {
      acc[dept] = (membersByDept[dept] ?? []).filter((m) =>
        (m.person?.name ?? "").toLowerCase().includes(q) ||
        m.roleTitle.toLowerCase().includes(q) ||
        (m.characterName ?? "").toLowerCase().includes(q)
      );
      return acc;
    }, {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membersByDept, rosterSearch]);

  if (!production) return <div className="text-muted-foreground">Caricamento...</div>;

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
              <FormField label="Titolo *">
                <Input required value={prodEditForm.title} onChange={(e) => setProdEditForm({ ...prodEditForm, title: e.target.value })} />
              </FormField>
              <FormField label="Compositore">
                <Input value={prodEditForm.composer} onChange={(e) => setProdEditForm({ ...prodEditForm, composer: e.target.value })} />
              </FormField>
              <FormField label="Teatro *">
                <select required value={prodEditForm.theatreId} onChange={(e) => setProdEditForm({ ...prodEditForm, theatreId: e.target.value })}>
                  <option value="">Seleziona teatro...</option>
                  {theatreOptions.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.city}</option>)}
                </select>
              </FormField>
              <div className="grid grid-cols-2 gap-2">
                <FormField label="Inizio">
                  <Input type="date" value={prodEditForm.startDate} onChange={(e) => setProdEditForm({ ...prodEditForm, startDate: e.target.value })} />
                </FormField>
                <FormField label="Fine">
                  <Input type="date" value={prodEditForm.endDate} onChange={(e) => setProdEditForm({ ...prodEditForm, endDate: e.target.value })} />
                </FormField>
              </div>
            </div>
            <div className="col-span-2 border-t pt-3 space-y-3">
              <p className="text-sm font-medium text-foreground/70">Direzione di scena</p>
              <div className="grid grid-cols-3 gap-2">
                <FormField label="Nome"><Input value={prodEditForm.stageManagerName} onChange={(e) => setProdEditForm({ ...prodEditForm, stageManagerName: e.target.value })} placeholder="Nome" /></FormField>
                <FormField label="Email"><Input type="email" value={prodEditForm.stageManagerEmail} onChange={(e) => setProdEditForm({ ...prodEditForm, stageManagerEmail: e.target.value })} placeholder="email@esempio.it" /></FormField>
                <FormField label="Telefono"><Input value={prodEditForm.stageManagerPhone} onChange={(e) => setProdEditForm({ ...prodEditForm, stageManagerPhone: e.target.value })} placeholder="+39 334..." /></FormField>
              </div>
              <p className="text-sm font-medium text-foreground/70">Assistente Direzione di Scena</p>
              <div className="grid grid-cols-3 gap-2">
                <FormField label="Nome"><Input value={prodEditForm.asstStageManagerName} onChange={(e) => setProdEditForm({ ...prodEditForm, asstStageManagerName: e.target.value })} placeholder="Nome" /></FormField>
                <FormField label="Email"><Input type="email" value={prodEditForm.asstStageManagerEmail} onChange={(e) => setProdEditForm({ ...prodEditForm, asstStageManagerEmail: e.target.value })} placeholder="email@esempio.it" /></FormField>
                <FormField label="Telefono"><Input value={prodEditForm.asstStageManagerPhone} onChange={(e) => setProdEditForm({ ...prodEditForm, asstStageManagerPhone: e.target.value })} placeholder="+39 380..." /></FormField>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm"><Check size={13} /> Salva</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowProdEdit(false)}><X size={13} /> Annulla</Button>
            </div>
          </form>
        ) : (
          <>
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
            {(production.stageManagerName || production.asstStageManagerName) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {production.stageManagerName && (
                  <div className="flex items-center gap-2.5 rounded-lg border bg-muted/30 px-3 py-2 text-xs">
                    <span className="text-muted-foreground font-medium uppercase tracking-wide text-[10px]">Dir. di scena</span>
                    <span className="w-px h-3 bg-border" />
                    <span className="font-medium text-foreground/90">{production.stageManagerName}</span>
                    {production.stageManagerEmail && (
                      <a href={`mailto:${production.stageManagerEmail}`} className="text-muted-foreground hover:text-primary transition-colors">{production.stageManagerEmail}</a>
                    )}
                    {production.stageManagerPhone && (
                      <a href={`tel:${production.stageManagerPhone}`} className="text-muted-foreground hover:text-primary transition-colors">{production.stageManagerPhone}</a>
                    )}
                  </div>
                )}
                {production.asstStageManagerName && (
                  <div className="flex items-center gap-2.5 rounded-lg border bg-muted/30 px-3 py-2 text-xs">
                    <span className="text-muted-foreground font-medium uppercase tracking-wide text-[10px]">Assistente</span>
                    <span className="w-px h-3 bg-border" />
                    <span className="font-medium text-foreground/90">{production.asstStageManagerName}</span>
                    {production.asstStageManagerEmail && (
                      <a href={`mailto:${production.asstStageManagerEmail}`} className="text-muted-foreground hover:text-primary transition-colors">{production.asstStageManagerEmail}</a>
                    )}
                    {production.asstStageManagerPhone && (
                      <a href={`tel:${production.asstStageManagerPhone}`} className="text-muted-foreground hover:text-primary transition-colors">{production.asstStageManagerPhone}</a>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Workflow stepper */}
      <div className="flex items-center gap-4 rounded-lg border bg-muted/20 px-4 py-3 text-sm">
        <div className="flex items-center gap-2">
          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold shrink-0 transition-colors ${hasRoster ? "bg-success/20 text-success-foreground" : "bg-primary text-primary-foreground"}`}>
            {hasRoster ? <Check size={12} /> : "1"}
          </span>
          <span className={`font-medium transition-colors ${hasRoster ? "text-muted-foreground" : "text-foreground"}`}>
            Roster
            {hasRoster && (
              <span className="ml-1 font-normal text-muted-foreground">
                · {production.members.length} {production.members.length === 1 ? "persona" : "persone"}
              </span>
            )}
          </span>
        </div>
        <ChevronRight size={14} className="text-muted-foreground shrink-0" />
        <div className="flex items-center gap-2">
          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold shrink-0 transition-colors ${hasRoster ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
            2
          </span>
          <span className={`font-medium transition-colors ${hasRoster ? "text-foreground" : "text-muted-foreground"}`}>
            Ordini del Giorno
          </span>
        </div>
        {!hasRoster && (
          <span className="ml-auto text-xs text-muted-foreground italic">
            Aggiungi le persone al Roster per iniziare a creare gli ODG
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6 items-start">
        {/* ODG column — left */}
        <div className="space-y-4">
          <h2 className="text-base font-bold flex items-center gap-2"><CalendarDays size={16} /> Ordini del Giorno</h2>

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
                      ? <span className="flex items-center gap-1 text-xs font-medium text-success-foreground"><Check size={13} className="shrink-0" /> Definitivo</span>
                      : odg.status === "BOZZA"
                        ? <span className="text-xs font-medium text-warning-foreground">In lavorazione</span>
                        : <span className="text-xs font-medium text-warning-foreground">Iniziato</span>;

                  if (odg) {
                    return (
                      <div key={dayStr} className="group flex items-center rounded-lg border bg-card hover:bg-accent/30 transition-colors">
                        <Link href={`/productions/${id}/odg/${odg.id}`} className="flex-1 px-4 py-3 flex items-center justify-between">
                          <p className="font-semibold capitalize text-sm">{label}</p>
                          {statusDot}
                        </Link>
                        <Button
                          size="icon" variant="ghost-destructive"
                          className="mr-2 opacity-0 group-hover:opacity-100"
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

        {/* Roster — right, sticky */}
        <div className="sticky top-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold flex items-center gap-2"><Users size={16} /> Roster</h2>
            <Button size="sm" variant="outline" onClick={() => setShowMemberForm(!showMemberForm)}>
              <Plus size={14} /> Aggiungi
            </Button>
          </div>

          {/* Live search */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={rosterSearch}
              onChange={(e) => setRosterSearch(e.target.value)}
              placeholder="Cerca per nome, ruolo o personaggio…"
              className="pl-8 h-8 text-sm"
            />
            {rosterSearch && (
              <button onClick={() => setRosterSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={13} />
              </button>
            )}
          </div>

          {showMemberForm && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Nuovo membro</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={addMember} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Dipartimento *">
                      <select value={memberForm.department} onChange={(e) => setMemberForm({ ...memberForm, department: e.target.value, customDept: "", roleTitle: "" })} className="w-full border border-input rounded-md px-2 py-1.5 text-sm bg-background">
                        <optgroup label="Compagnia">
                          <option value="CAST">Solisti</option>
                          <option value="CAST_EXTRAS">Extras</option>
                        </optgroup>
                        <option value="TEAM_CREATIVO">Team Creativo</option>
                        <optgroup label="Musica">
                          <option value="ORCHESTRA">Orchestra</option>
                          <option value="MAESTRI_COLLABORATORI">Maestri Collaboratori</option>
                        </optgroup>
                        <optgroup label="Reparti Tecnici">
                          {TECHNICAL_DEPT_VALUES.map((v) => <option key={v} value={v}>{DEPT_LABEL[v]}</option>)}
                        </optgroup>
                        {productionCustomDepts.length > 0 && (
                          <optgroup label="Personalizzati">
                            {productionCustomDepts.map((d) => <option key={d} value={d}>{d}</option>)}
                          </optgroup>
                        )}
                        <option value="__CUSTOM__">+ Personalizzato…</option>
                      </select>
                      {memberForm.department === "__CUSTOM__" && (
                        <Input required value={memberForm.customDept} onChange={(e) => setMemberForm({ ...memberForm, customDept: e.target.value })} placeholder="Nome reparto" className="h-8 text-sm mt-1" />
                      )}
                    </FormField>
                    {memberForm.department === "CAST_EXTRAS" ? (
                      <FormField label="Tipo *">
                        <select required value={memberForm.roleTitle} onChange={(e) => setMemberForm({ ...memberForm, roleTitle: e.target.value })} className="w-full border border-input rounded-md px-2 py-1.5 text-sm bg-background">
                          <option value="">Seleziona tipo…</option>
                          {EXTRAS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </FormField>
                    ) : (
                      <>
                        <FormField label="Nome *">
                          <Input required size={1} value={memberForm.personName} onChange={(e) => setMemberForm({ ...memberForm, personName: e.target.value })} placeholder="Nome e Cognome" className="h-8 text-sm" />
                        </FormField>
                        <FormField label="Ruolo *">
                          <Input required value={memberForm.roleTitle} onChange={(e) => setMemberForm({ ...memberForm, roleTitle: e.target.value })} placeholder="Direttore d'orchestra" className="h-8 text-sm" />
                        </FormField>
                        {memberForm.department === "CAST" && (
                          <FormField label="Personaggio">
                            <Input value={memberForm.characterName} onChange={(e) => setMemberForm({ ...memberForm, characterName: e.target.value })} placeholder="Gulliver" className="h-8 text-sm" />
                          </FormField>
                        )}
                        <FormField label="Email">
                          <Input type="email" value={memberForm.email} onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })} className="h-8 text-sm" />
                        </FormField>
                        <FormField label="Telefono">
                          <Input value={memberForm.phone} onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })} className="h-8 text-sm" />
                        </FormField>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm">Aggiungi</Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowMemberForm(false)}>Annulla</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card className="overflow-hidden">
            <div className="overflow-y-auto max-h-[calc(100vh-320px)]">
              {production.members.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  Nessun membro ancora. Aggiungi le persone che partecipano alla produzione.
                </p>
              )}
              {production.members.length > 0 && rosterSearch && fullDeptOrder.every((d) => (filteredMembersByDept[d] ?? []).length === 0) && (
                <p className="text-center text-sm text-muted-foreground py-8">Nessun risultato per &ldquo;{rosterSearch}&rdquo;</p>
              )}
              {fullDeptOrder.map((dept) => {
                const deptMembers = filteredMembersByDept[dept] ?? [];
                if (deptMembers.length === 0) return null;
                const isCollapsed = collapsedDepts.has(dept);

                return (
                  <div key={dept}>
                    {/* Department header — sticky within scroll container */}
                    <button
                      onClick={() => toggleCollapsedDept(dept)}
                      className="sticky top-0 z-10 w-full flex items-center justify-between px-3 py-1.5 bg-muted/60 backdrop-blur-sm border-b text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/80 transition-colors"
                    >
                      <span>{DEPT_LABEL[dept] ?? dept}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-normal normal-case tracking-normal opacity-60">{deptMembers.length}</span>
                        <ChevronDown size={12} className={`transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                      </div>
                    </button>

                    {!isCollapsed && (
                      <div className="divide-y">
                        {deptMembers.map((m) => {
                          const isEditing = editState?.memberId === m.id;
                          const isExpanded = expandedId === m.id;

                          if (isEditing && editState) {
                            return (
                              <div key={m.id} className="p-3 space-y-2 bg-muted/40">
                                <select value={editState.department} onChange={(e) => setEditState({ ...editState, department: e.target.value })} className="w-full border border-input rounded px-2 py-1.5 text-sm bg-background">
                                  <optgroup label="Compagnia">
                                    <option value="CAST">Solisti</option>
                                    <option value="CAST_EXTRAS">Extras</option>
                                  </optgroup>
                                  <option value="TEAM_CREATIVO">Team Creativo</option>
                                  <optgroup label="Musica">
                                    <option value="ORCHESTRA">Orchestra</option>
                                    <option value="MAESTRI_COLLABORATORI">Maestri Collaboratori</option>
                                  </optgroup>
                                  <optgroup label="Reparti Tecnici">
                                    {TECHNICAL_DEPT_VALUES.map((v) => <option key={v} value={v}>{DEPT_LABEL[v]}</option>)}
                                  </optgroup>
                                  {productionCustomDepts.length > 0 && (
                                    <optgroup label="Personalizzati">
                                      {productionCustomDepts.map((d) => <option key={d} value={d}>{d}</option>)}
                                    </optgroup>
                                  )}
                                  <option value="__CUSTOM__">+ Personalizzato…</option>
                                </select>
                                {editState.department === "CAST_EXTRAS" ? (
                                  <select value={editState.roleTitle} onChange={(e) => setEditState({ ...editState, roleTitle: e.target.value })} className="w-full border border-input rounded px-2 py-1.5 text-sm bg-background">
                                    {EXTRAS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                  </select>
                                ) : (
                                  <>
                                    <Input value={editState.personName} onChange={(e) => setEditState({ ...editState, personName: e.target.value })} placeholder="Nome" className="text-sm" />
                                    <Input value={editState.roleTitle} onChange={(e) => setEditState({ ...editState, roleTitle: e.target.value })} placeholder="Ruolo" className="text-sm" />
                                    <Input value={editState.characterName} onChange={(e) => setEditState({ ...editState, characterName: e.target.value })} placeholder="Personaggio" className="text-sm" />
                                  </>
                                )}
                                <div className="grid grid-cols-2 gap-2">
                                  <Input type="email" value={editState.email} onChange={(e) => setEditState({ ...editState, email: e.target.value })} placeholder="Email" className="text-sm" />
                                  <Input value={editState.phone} onChange={(e) => setEditState({ ...editState, phone: e.target.value })} placeholder="Telefono" className="text-sm" />
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="ghost" className="text-success-foreground" onClick={saveEdit}><Check size={13} /> Salva</Button>
                                  <Button size="sm" variant="ghost" onClick={() => setEditState(null)}><X size={13} /> Annulla</Button>
                                </div>
                              </div>
                            );
                          }

                          const hasDetails = !!(m.person?.email || m.person?.phone || m.notes);
                          return (
                            <React.Fragment key={m.id}>
                              <div
                                className={`group flex items-center gap-2 px-3 py-2.5 transition-colors ${hasDetails ? "cursor-pointer hover:bg-muted/30" : ""}`}
                                onClick={() => hasDetails && setExpandedId(isExpanded ? null : m.id)}
                              >
                                {hasDetails && (
                                  <ChevronDown size={13} className={`text-muted-foreground/50 transition-transform shrink-0 ${isExpanded ? "" : "-rotate-90"}`} />
                                )}
                                {!hasDetails && <span className="w-[13px] shrink-0" />}
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium truncate ${!m.person && m.department !== "CAST_EXTRAS" ? "text-muted-foreground italic" : ""}`}>
                                    {m.department === "CAST_EXTRAS" ? m.roleTitle : (m.person?.name ?? "— da assegnare")}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                    <Badge variant="secondary" className="text-xs font-normal px-1.5 py-0.5" style={{ backgroundColor: DEPT_BG[m.department] ?? "#e5e5e544" }}>
                                      {DEPT_LABEL[m.department] ?? m.department}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground italic">{m.roleTitle}</span>
                                    {m.characterName && (
                                      <span className="text-xs text-foreground/70">· {m.characterName}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <Button size="icon-sm" variant="ghost" onClick={() => startEdit(m)}><Pencil size={12} /></Button>
                                  <Button size="icon-sm" variant="ghost-destructive" onClick={() => removeMember(m)}><Trash2 size={12} /></Button>
                                </div>
                              </div>
                              {isExpanded && hasDetails && (
                                <div className="bg-muted/20 px-8 py-3 space-y-1.5 text-sm">
                                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                                    {m.person?.email && (
                                      <a href={`mailto:${m.person.email}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/></svg>
                                        {m.person.email}
                                      </a>
                                    )}
                                    {m.person?.phone && (
                                      <a href={`tel:${m.person.phone}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/></svg>
                                        {m.person.phone}
                                      </a>
                                    )}
                                  </div>
                                  {m.notes && <p className="text-xs text-muted-foreground italic">{m.notes}</p>}
                                </div>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
