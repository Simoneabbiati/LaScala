"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ChevronRight, Check, FileDown, FileText, Pencil, Plus, Trash2, X } from "lucide-react";
import { ACTIVITIES, DEPT_COLOR, DEPT_LABEL } from "@/lib/constants";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import ConfirmDialog from "@/components/ConfirmDialog";

type Location = { id: string; name: string };
type Person = { id: string; name: string };
type Member = { id: string; department: string; roleTitle: string; characterName?: string; person: Person };
type OdgEntry = { id: string; startTime: string; endTime: string; activity: string; location?: Location; notes?: string; member: Member };
type OdgSession = { id: string; startTime: string; endTime: string; activity: string; location?: Location };
type Theatre = { id: string; name: string; city: string; locations: Location[] };
type Production = { id: string; title: string; composer?: string; theatre: Theatre; members: Member[] };
type OdgFull = { id: string; date: string; status?: string | null; notes?: string; production: Production; sessions: OdgSession[]; entries: OdgEntry[] };

const DEPT_ORDER = ["TEAM_CREATIVO", "CAST", "ORCHESTRA", "MAESTRI_COLLABORATORI", "AREA_TECNICA"];
const emptySession = () => ({ startTime: "", endTime: "", activity: "", locationId: "" });
const emptyEntry = () => ({ memberId: "", startTime: "", endTime: "", activity: "", locationId: "", notes: "" });

type SessionEdit = { id: string; startTime: string; endTime: string; activity: string; locationId: string };
type ConfirmState = { open: boolean; title: string; description: string; onConfirm: () => void };
const defaultConfirm: ConfirmState = { open: false, title: "", description: "", onConfirm: () => {} };

export default function OdgPage({ params }: { params: Promise<{ id: string; odgId: string }> }) {
  const { id: productionId, odgId } = use(params);
  const [odg, setOdg] = useState<OdgFull | null>(null);
  const [sessionForm, setSessionForm] = useState(emptySession());
  const [entryForm, setEntryForm] = useState(emptyEntry());
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editSession, setEditSession] = useState<SessionEdit | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(defaultConfirm);

  const load = () => fetch(`/api/odg/${odgId}`).then((r) => r.json()).then(setOdg);
  useEffect(() => { load(); }, [odgId]);

  const setStatus = async (status: string | null) => {
    await fetch(`/api/odg/${odgId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const addSession = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`/api/odg/${odgId}/sessions`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...sessionForm, sortOrder: odg?.sessions.length ?? 0 }),
    });
    setSessionForm(emptySession());
    setShowSessionForm(false);
    load();
  };

  const saveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSession) return;
    await fetch(`/api/odg/${odgId}/sessions/${editSession.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editSession),
    });
    setEditSession(null);
    load();
  };

  const deleteSession = (id: string) => setConfirm({
    open: true, title: "Eliminare blocco?", description: "Rimuovere questo blocco dal programma del giorno?",
    onConfirm: async () => { await fetch(`/api/odg/${odgId}/sessions/${id}`, { method: "DELETE" }); setConfirm(defaultConfirm); load(); },
  });

  const addEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`/api/odg/${odgId}/entries`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...entryForm, sortOrder: odg?.entries.length ?? 0 }),
    });
    setEntryForm(emptyEntry());
    setShowEntryForm(false);
    load();
  };

  const deleteEntry = (id: string, name: string) => setConfirm({
    open: true, title: "Eliminare chiamata?", description: `Rimuovere la chiamata di ${name} da questo ODG?`,
    onConfirm: async () => { await fetch(`/api/odg/${odgId}/entries/${id}`, { method: "DELETE" }); setConfirm(defaultConfirm); load(); },
  });

  // When user picks an activity, auto-fill time and location from the matching session
  const handleEntryActivity = (activity: string) => {
    const match = odg?.sessions.find((s) => s.activity === activity);
    setEntryForm((prev) => ({
      ...prev,
      activity,
      startTime: match?.startTime ?? prev.startTime,
      endTime: match?.endTime ?? prev.endTime,
      locationId: match?.location?.id ?? "",
    }));
  };

  if (!odg) return <div className="text-muted-foreground">Caricamento...</div>;

  const { production } = odg;
  const locations = production.theatre.locations;
  const dateLabel = new Date(odg.date).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  // Only activities already defined in the day sessions
  const sessionActivities = odg.sessions.map((s) => ({ activity: s.activity, location: s.location }));
  const uniqueSessionActivities = sessionActivities.filter((a, i, arr) => arr.findIndex((b) => b.activity === a.activity) === i);

  const entriesByDept = DEPT_ORDER.reduce<Record<string, OdgEntry[]>>((acc, dept) => {
    acc[dept] = odg.entries.filter((e) => e.member.department === dept);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <ConfirmDialog {...confirm} destructive confirmLabel="Elimina" onCancel={() => setConfirm(defaultConfirm)} />

      {/* Header */}
      <div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
          <Link href="/productions" className="hover:text-foreground">Produzioni</Link>
          <ChevronRight size={14} />
          <Link href={`/productions/${productionId}`} className="hover:text-foreground">{production.title}</Link>
          <ChevronRight size={14} />
          <span>ODG</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight capitalize">{dateLabel}</h1>
            <p className="text-muted-foreground">{production.title} · {production.theatre.name}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Status toggle */}
            <div className="flex items-center rounded-lg border overflow-hidden text-sm">
              <button
                onClick={() => setStatus(odg.status === "BOZZA" ? null : "BOZZA")}
                className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors ${odg.status === "BOZZA" ? "bg-amber-100 text-amber-700 font-semibold" : "text-muted-foreground hover:bg-muted/50"}`}
              >
                <Check size={13} /> In lavorazione
              </button>
              <div className="w-px h-6 bg-border" />
              <button
                onClick={() => setStatus(odg.status === "DEFINITIVO" ? null : "DEFINITIVO")}
                className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors ${odg.status === "DEFINITIVO" ? "bg-green-100 text-green-700 font-semibold" : "text-muted-foreground hover:bg-muted/50"}`}
              >
                <Check size={13} /> Definitivo
              </button>
            </div>
            <Link href={`/api/odg/${odgId}/pdf`} target="_blank" className={cn(buttonVariants({ variant: "outline" }))}>
              <FileDown size={15} /> PDF
            </Link>
            <Link href={`/api/odg/${odgId}/word`} className={cn(buttonVariants({ variant: "outline" }))}>
              <FileText size={15} /> Word
            </Link>
          </div>
        </div>
      </div>

      {/* Programma del giorno */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Programma del giorno</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowSessionForm(!showSessionForm)}>
              <Plus size={13} /> Aggiungi blocco
            </Button>
          </div>
        </CardHeader>

        {(odg.sessions.length > 0 || showSessionForm) && <Separator />}

        <CardContent className="pt-3 space-y-1">
          {odg.sessions.length === 0 && !showSessionForm && (
            <p className="text-sm text-muted-foreground">Nessun blocco orario ancora.</p>
          )}

          {odg.sessions.map((s) => {
            if (editSession?.id === s.id) {
              return (
                <form key={s.id} onSubmit={saveSession} className="flex items-center gap-2 bg-muted/40 rounded-lg px-2 py-1.5">
                  <Input type="time" value={editSession.startTime} onChange={(e) => setEditSession({ ...editSession, startTime: e.target.value })} className="h-7 w-24 text-sm" />
                  <Input type="time" value={editSession.endTime} onChange={(e) => setEditSession({ ...editSession, endTime: e.target.value })} className="h-7 w-24 text-sm" />
                  <select value={editSession.activity} onChange={(e) => setEditSession({ ...editSession, activity: e.target.value })} className="flex-1 border border-input rounded px-2 py-1 text-sm bg-background">
                    {ACTIVITIES.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <select value={editSession.locationId} onChange={(e) => setEditSession({ ...editSession, locationId: e.target.value })} className="w-36 border border-input rounded px-2 py-1 text-sm bg-background">
                    <option value="">—</option>
                    {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                  <Button type="submit" size="icon" variant="ghost" className="h-7 w-7 text-green-600"><Check size={13} /></Button>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditSession(null)}><X size={13} /></Button>
                </form>
              );
            }
            return (
              <div key={s.id} className="group flex items-center gap-3 text-sm rounded-lg px-2 py-1.5 hover:bg-muted/40">
                <span className="font-mono text-muted-foreground w-28 shrink-0">{s.startTime} – {s.endTime}</span>
                <span className="font-medium">{s.activity}</span>
                {s.location && <span className="text-muted-foreground text-xs">({s.location.name})</span>}
                <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditSession({ id: s.id, startTime: s.startTime, endTime: s.endTime, activity: s.activity, locationId: s.location?.id ?? "" })}>
                    <Pencil size={11} />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => deleteSession(s.id)}>
                    <Trash2 size={11} />
                  </Button>
                </div>
              </div>
            );
          })}

          {showSessionForm && (
            <form onSubmit={addSession} className="border border-border rounded-lg p-3 space-y-2 bg-muted/20 mt-2">
              <div className="grid grid-cols-5 gap-2">
                <Input required type="time" value={sessionForm.startTime} onChange={(e) => setSessionForm({ ...sessionForm, startTime: e.target.value })} className="h-8 text-sm" />
                <Input required type="time" value={sessionForm.endTime} onChange={(e) => setSessionForm({ ...sessionForm, endTime: e.target.value })} className="h-8 text-sm" />
                <select required value={sessionForm.activity} onChange={(e) => setSessionForm({ ...sessionForm, activity: e.target.value })} className="col-span-2 border border-input rounded-md px-2 py-1.5 text-sm bg-background">
                  <option value="">Attività...</option>
                  {ACTIVITIES.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                <select value={sessionForm.locationId} onChange={(e) => setSessionForm({ ...sessionForm, locationId: e.target.value })} className="border border-input rounded-md px-2 py-1.5 text-sm bg-background">
                  <option value="">Luogo...</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm">Aggiungi</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowSessionForm(false)}>Annulla</Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Chiamate individuali */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Chiamate individuali</h2>
          <Button size="sm" variant="outline" onClick={() => setShowEntryForm(!showEntryForm)}>
            <Plus size={14} /> Aggiungi chiamata
          </Button>
        </div>

        {showEntryForm && (
          <Card>
            <CardContent className="pt-4">
              <form onSubmit={addEntry} className="space-y-3">
                <div className="grid grid-cols-3 gap-3">

                  {/* 1. Attività — first, drives the rest */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Attività *</label>
                    {uniqueSessionActivities.length > 0 ? (
                      <select required value={entryForm.activity} onChange={(e) => handleEntryActivity(e.target.value)} className="w-full border border-input rounded-md px-2 py-1.5 text-sm bg-background">
                        <option value="">Seleziona attività...</option>
                        {uniqueSessionActivities.map(({ activity }) => <option key={activity} value={activity}>{activity}</option>)}
                      </select>
                    ) : (
                      <p className="text-xs text-amber-600 pt-1.5">Aggiungi prima un blocco nel programma del giorno.</p>
                    )}
                  </div>

                  {/* 2. Orario inizio — auto-filled from session */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Orario inizio *</label>
                    <Input required type="time" value={entryForm.startTime} onChange={(e) => setEntryForm({ ...entryForm, startTime: e.target.value })} className="h-8 text-sm" />
                  </div>

                  {/* 3. Orario fine — auto-filled from session */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Orario fine *</label>
                    <Input required type="time" value={entryForm.endTime} onChange={(e) => setEntryForm({ ...entryForm, endTime: e.target.value })} className="h-8 text-sm" />
                  </div>

                  {/* 4. Persona */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Persona *</label>
                    <select required value={entryForm.memberId} onChange={(e) => setEntryForm({ ...entryForm, memberId: e.target.value })} className="w-full border border-input rounded-md px-2 py-1.5 text-sm bg-background">
                      <option value="">Seleziona persona...</option>
                      {DEPT_ORDER.map((dept) => {
                        const members = production.members.filter((m) => m.department === dept);
                        if (!members.length) return null;
                        return (
                          <optgroup key={dept} label={DEPT_LABEL[dept]}>
                            {members.map((m) => <option key={m.id} value={m.id}>{m.person.name} — {m.roleTitle}</option>)}
                          </optgroup>
                        );
                      })}
                    </select>
                  </div>

                  {/* 5. Luogo — auto-filled, can override */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Luogo</label>
                    <select value={entryForm.locationId} onChange={(e) => setEntryForm({ ...entryForm, locationId: e.target.value })} className="w-full border border-input rounded-md px-2 py-1.5 text-sm bg-background">
                      <option value="">—</option>
                      {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>

                  {/* 6. Note */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Note</label>
                    <Input value={entryForm.notes} onChange={(e) => setEntryForm({ ...entryForm, notes: e.target.value })} placeholder="Note opzionali" className="h-8 text-sm" />
                  </div>

                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm">Aggiungi</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setShowEntryForm(false)}>Annulla</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Entries by department */}
        <div className="space-y-3">
          {DEPT_ORDER.map((dept) => {
            const entries = entriesByDept[dept];
            if (!entries?.length) return null;
            return (
              <Card key={dept} className="overflow-hidden">
                <div className="px-4 py-2 text-sm font-semibold" style={{ backgroundColor: DEPT_COLOR[dept] + "44" }}>
                  {DEPT_LABEL[dept]}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nominativo</TableHead>
                      <TableHead>Orario</TableHead>
                      <TableHead>Attività</TableHead>
                      <TableHead>Luogo</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow key={entry.id} className="group">
                        <TableCell>
                          <div className="font-medium text-sm">{entry.member.person.name}</div>
                          <div className="text-xs text-muted-foreground italic">{entry.member.roleTitle}</div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{entry.startTime} – {entry.endTime}</TableCell>
                        <TableCell className="text-sm">{entry.activity}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{entry.location?.name ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{entry.notes ?? "—"}</TableCell>
                        <TableCell>
                          <Button
                            size="icon" variant="ghost"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                            onClick={() => deleteEntry(entry.id, entry.member.person.name)}
                          >
                            <Trash2 size={12} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            );
          })}
          {odg.entries.length === 0 && (
            <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">Nessuna chiamata ancora. Aggiungi le presenze per oggi.</CardContent></Card>
          )}
        </div>
      </div>
    </div>
  );
}
