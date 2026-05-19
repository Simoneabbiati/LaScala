"use client";
import { useEffect, useRef, useState, use } from "react";
import Link from "next/link";
import { ChevronRight, Check, FileDown, FileText, Pencil, Plus, Trash2, X } from "lucide-react";
import { FormField } from "@/components/ui/form-field";
import { ACTIVITIES, DEPT_BG, DEPT_LABEL } from "@/lib/constants";
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
type OdgEntry = { id: string; startTime: string; endTime: string; activity: string; location?: Location; notes?: string; characterName?: string; member: Member };
type OdgSession = { id: string; startTime: string; endTime: string; activity: string; location?: Location };
type Theatre = { id: string; name: string; city: string; locations: Location[] };
type Production = { id: string; title: string; composer?: string; theatre: Theatre; members: Member[] };
type OdgFull = { id: string; date: string; status?: string | null; notes?: string; extraEvents?: string; production: Production; sessions: OdgSession[]; entries: OdgEntry[] };

const DEPT_ORDER = ["TEAM_CREATIVO", "CAST", "ORCHESTRA", "MAESTRI_COLLABORATORI", "AREA_TECNICA"];
const emptySession = () => ({ startTime: "", endTime: "", activity: "", locationId: "" });
const emptyEntry = () => ({ memberId: "", startTime: "", endTime: "", activity: "", locationId: "", notes: "", characterName: "" });

type SessionEdit = { id: string; startTime: string; endTime: string; activity: string; locationId: string };
type EntryEdit = { id: string; startTime: string; endTime: string; activity: string; locationId: string; notes: string; characterName: string };
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
  const [editEntry, setEditEntry] = useState<EntryEdit | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(defaultConfirm);
  const [notesValue, setNotesValue] = useState("");
  const [extraEventsValue, setExtraEventsValue] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [showExtraEvents, setShowExtraEvents] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [editingExtraEvents, setEditingExtraEvents] = useState(false);
  const latestNotes = useRef("");
  const latestExtraEvents = useRef("");

  const load = () => fetch(`/api/odg/${odgId}`).then((r) => r.json()).then((data) => {
    setOdg(data);
    setNotesValue(data.notes ?? ""); latestNotes.current = data.notes ?? "";
    setExtraEventsValue(data.extraEvents ?? ""); latestExtraEvents.current = data.extraEvents ?? "";
    setShowNotes(!!data.notes);
    setShowExtraEvents(!!data.extraEvents);
    setEditingNotes(false);
    setEditingExtraEvents(false);
  });
  useEffect(() => { load(); }, [odgId]);

  const setStatus = async (status: string | null) => {
    await fetch(`/api/odg/${odgId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const addSession = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await fetch(`/api/odg/${odgId}/sessions`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...sessionForm, sortOrder: odg?.sessions.length ?? 0 }),
    });
    setSessionForm(emptySession());
    setShowSessionForm(false);
    load();
  };

  const saveSession = async (e: React.FormEvent<HTMLFormElement>) => {
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

  const addEntry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await fetch(`/api/odg/${odgId}/entries`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...entryForm, sortOrder: odg?.entries.length ?? 0 }),
    });
    setEntryForm(emptyEntry());
    setShowEntryForm(false);
    load();
  };

  const saveEntry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editEntry) return;
    await fetch(`/api/odg/${odgId}/entries/${editEntry.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editEntry),
    });
    setEditEntry(null);
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

  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const extraEventsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNotesChange = (value: string) => {
    setNotesValue(value);
    latestNotes.current = value;
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(async () => {
      await fetch(`/api/odg/${odgId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: value }),
      });
      if (!value.trim()) setShowNotes(false);
    }, 600);
  };

  const handleExtraEventsChange = (value: string) => {
    setExtraEventsValue(value);
    latestExtraEvents.current = value;
    if (extraEventsTimer.current) clearTimeout(extraEventsTimer.current);
    extraEventsTimer.current = setTimeout(async () => {
      await fetch(`/api/odg/${odgId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extraEvents: value }),
      });
      if (!value.trim()) setShowExtraEvents(false);
    }, 600);
  };

  const saveNotesNow = async (value: string) => {
    if (notesTimer.current) clearTimeout(notesTimer.current);
    await fetch(`/api/odg/${odgId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: value }),
    });
    if (!value.trim()) setShowNotes(false);
    setEditingNotes(false);
  };

  const saveExtraEventsNow = async (value: string) => {
    if (extraEventsTimer.current) clearTimeout(extraEventsTimer.current);
    await fetch(`/api/odg/${odgId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ extraEvents: value }),
    });
    if (!value.trim()) setShowExtraEvents(false);
    setEditingExtraEvents(false);
  };

  const flushAndExport = async (url: string, newTab = false) => {
    if (notesTimer.current) clearTimeout(notesTimer.current);
    if (extraEventsTimer.current) clearTimeout(extraEventsTimer.current);
    await fetch(`/api/odg/${odgId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: latestNotes.current, extraEvents: latestExtraEvents.current }),
    });
    if (newTab) window.open(url, "_blank");
    else window.location.href = url;
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
          <div className="flex items-center gap-3 shrink-0">
            {/* Status toggle */}
            <div className="flex rounded-md border overflow-hidden text-sm">
              <button
                onClick={() => setStatus(odg.status === "BOZZA" ? null : "BOZZA")}
                className={`px-4 py-1.5 font-medium transition-colors border-r ${odg.status === "BOZZA" ? "bg-warning text-warning-foreground border-warning-border" : "text-muted-foreground hover:bg-muted/50 border-border"}`}
              >
                In lavorazione
              </button>
              <button
                onClick={() => setStatus(odg.status === "DEFINITIVO" ? null : "DEFINITIVO")}
                className={`flex items-center gap-1.5 px-4 py-1.5 font-medium transition-colors ${odg.status === "DEFINITIVO" ? "bg-success text-success-foreground" : "text-muted-foreground hover:bg-muted/50"}`}
              >
                {odg.status === "DEFINITIVO" && <Check size={13} />} Definitivo
              </button>
            </div>
            {/* Export buttons */}
            <div className="flex gap-1.5">
              <button onClick={() => flushAndExport(`/api/odg/${odgId}/pdf`, true)} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
                <FileDown size={14} /> PDF
              </button>
              <button onClick={() => flushAndExport(`/api/odg/${odgId}/word`)} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
                <FileText size={14} /> Word
              </button>
            </div>
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
            <p className="pb-2 pt-1 text-sm text-muted-foreground">Nessun blocco orario ancora.</p>
          )}

          {(() => {
            type SessionGroup = { locationId: string | null; locationName: string | null; sessions: OdgSession[] };
            const groups: SessionGroup[] = [];
            const groupIndex = new Map<string | null, number>();
            for (const s of odg.sessions) {
              const key = s.location?.id ?? null;
              if (!groupIndex.has(key)) {
                groupIndex.set(key, groups.length);
                groups.push({ locationId: key, locationName: s.location?.name ?? null, sessions: [] });
              }
              groups[groupIndex.get(key)!].sessions.push(s);
            }
            const showHeaders = groups.length > 1 || (groups.length === 1 && groups[0].locationId !== null);

            return groups.map((group) => (
              <div key={group.locationId ?? "__none__"} className="space-y-0.5">
                {showHeaders && (
                  <div className="flex items-center gap-2 px-2 pt-2 pb-0.5">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide shrink-0">
                      {group.locationName ?? "Nessun luogo"}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}
                {group.sessions.map((s) => {
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
                        <Button type="submit" size="icon" variant="ghost" className="h-7 w-7 text-success-foreground"><Check size={13} /></Button>
                        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditSession(null)}><X size={13} /></Button>
                      </form>
                    );
                  }
                  return (
                    <div key={s.id} className="group flex items-center gap-3 text-sm rounded-lg px-2 py-1.5 hover:bg-muted/40">
                      <span className="font-mono text-muted-foreground w-28 shrink-0">{s.startTime} – {s.endTime}</span>
                      <span className="font-medium">{s.activity}</span>
                      {!showHeaders && s.location && <span className="text-muted-foreground text-xs">({s.location.name})</span>}
                      <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditSession({ id: s.id, startTime: s.startTime, endTime: s.endTime, activity: s.activity, locationId: s.location?.id ?? "" })}>
                          <Pencil size={11} />
                        </Button>
                        <Button size="icon" variant="ghost-destructive" className="h-6 w-6" onClick={() => deleteSession(s.id)}>
                          <Trash2 size={11} />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ));
          })()}

          {showSessionForm && (
            <form onSubmit={addSession} className="px-1 pt-2 pb-1 space-y-2 mt-2">
              <div className="grid grid-cols-5 gap-2">
                <FormField label="Tipo di attività" className="col-span-2">
                  <select required value={sessionForm.activity} onChange={(e) => setSessionForm({ ...sessionForm, activity: e.target.value })} className="w-full border border-input rounded-md px-2 py-1.5 text-sm bg-background">
                    <option value="">Seleziona attività…</option>
                    {ACTIVITIES.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </FormField>
                <FormField label="Ora inizio">
                  <Input required type="time" value={sessionForm.startTime} onChange={(e) => setSessionForm({ ...sessionForm, startTime: e.target.value })} className="h-8 text-sm" />
                </FormField>
                <FormField label="Ora fine">
                  <Input required type="time" value={sessionForm.endTime} onChange={(e) => setSessionForm({ ...sessionForm, endTime: e.target.value })} className="h-8 text-sm" />
                </FormField>
                <FormField label="Sala / Luogo">
                  <select value={sessionForm.locationId} onChange={(e) => setSessionForm({ ...sessionForm, locationId: e.target.value })} className="w-full border border-input rounded-md px-2 py-1.5 text-sm bg-background">
                    <option value="">Nessuna sede</option>
                    {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </FormField>
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
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Chiamate individuali</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowEntryForm(!showEntryForm)}>
              <Plus size={14} /> Aggiungi chiamata
            </Button>
          </div>
        </CardHeader>

        {(odg.entries.length > 0 || showEntryForm) && <Separator />}

        <CardContent className="pt-3 space-y-3">

        {showEntryForm && (
          <form onSubmit={addEntry} className="space-y-3 pb-2">
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Attività *">
                {uniqueSessionActivities.length > 0 ? (
                  <select required value={entryForm.activity} onChange={(e) => handleEntryActivity(e.target.value)} className="w-full border border-input rounded-md px-2 py-1.5 text-sm bg-background">
                    <option value="">Seleziona attività...</option>
                    {uniqueSessionActivities.map(({ activity }) => <option key={activity} value={activity}>{activity}</option>)}
                  </select>
                ) : (
                  <p className="text-xs text-amber-600 pt-1.5">Aggiungi prima un blocco nel programma del giorno.</p>
                )}
              </FormField>
              <FormField label="Orario inizio *">
                <Input required type="time" value={entryForm.startTime} onChange={(e) => setEntryForm({ ...entryForm, startTime: e.target.value })} className="h-8 text-sm" />
              </FormField>
              <FormField label="Orario fine *">
                <Input required type="time" value={entryForm.endTime} onChange={(e) => setEntryForm({ ...entryForm, endTime: e.target.value })} className="h-8 text-sm" />
              </FormField>
              <FormField label="Persona *">
                <select required value={entryForm.memberId} onChange={(e) => {
                  const m = production.members.find((mb) => mb.id === e.target.value);
                  setEntryForm({ ...entryForm, memberId: e.target.value, characterName: m?.characterName ?? "" });
                }} className="w-full border border-input rounded-md px-2 py-1.5 text-sm bg-background">
                  <option value="">Seleziona persona...</option>
                  {DEPT_ORDER.map((dept) => {
                    const members = production.members.filter((m) => m.department === dept);
                    if (!members.length) return null;
                    return (
                      <optgroup key={dept} label={DEPT_LABEL[dept]}>
                        {members.filter((m) => m.person).map((m) => <option key={m.id} value={m.id}>{m.person.name}{m.characterName ? ` — ${m.characterName}` : ""}{m.department === "CAST" ? ` (${m.roleTitle})` : ""}</option>)}
                      </optgroup>
                    );
                  })}
                </select>
              </FormField>
              <FormField label="Personaggio">
                <Input value={entryForm.characterName} onChange={(e) => setEntryForm({ ...entryForm, characterName: e.target.value })} placeholder="Es. Violetta" className="h-8 text-sm" />
              </FormField>
              <FormField label="Luogo">
                <select value={entryForm.locationId} onChange={(e) => setEntryForm({ ...entryForm, locationId: e.target.value })} className="w-full border border-input rounded-md px-2 py-1.5 text-sm bg-background">
                  <option value="">—</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </FormField>
              <FormField label="Note">
                <Input value={entryForm.notes} onChange={(e) => setEntryForm({ ...entryForm, notes: e.target.value })} placeholder="Note opzionali" className="h-8 text-sm" />
              </FormField>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm">Aggiungi</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowEntryForm(false)}>Annulla</Button>
            </div>
          </form>
        )}

        {odg.entries.length === 0 && !showEntryForm && (
          <p className="pb-2 pt-1 text-sm text-muted-foreground">Nessuna chiamata ancora.</p>
        )}

        <div className="space-y-3">
          {DEPT_ORDER.map((dept) => {
            const entries = entriesByDept[dept];
            if (!entries?.length) return null;
            return (
              <Card key={dept} className="overflow-hidden">
                <div className="px-4 py-2 text-sm font-semibold" style={{ backgroundColor: DEPT_BG[dept] }}>
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
                    {entries.map((entry) => {
                      if (editEntry?.id === entry.id) {
                        return (
                          <TableRow key={entry.id}>
                            <TableCell colSpan={6}>
                              <form onSubmit={saveEntry} className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium shrink-0">{entry.member.person.name}</span>
                                {entry.member.department === "CAST" && (
                                  <Input value={editEntry.characterName} onChange={(e) => setEditEntry({ ...editEntry, characterName: e.target.value })} placeholder="Personaggio" className="h-7 w-28 text-sm" />
                                )}
                                <Input type="time" value={editEntry.startTime} onChange={(e) => setEditEntry({ ...editEntry, startTime: e.target.value })} className="h-7 w-24 text-sm" />
                                <Input type="time" value={editEntry.endTime} onChange={(e) => setEditEntry({ ...editEntry, endTime: e.target.value })} className="h-7 w-24 text-sm" />
                                <select value={editEntry.activity} onChange={(e) => setEditEntry({ ...editEntry, activity: e.target.value })} className="flex-1 border border-input rounded px-2 py-1 text-sm bg-background">
                                  {uniqueSessionActivities.map(({ activity }) => <option key={activity} value={activity}>{activity}</option>)}
                                </select>
                                <select value={editEntry.locationId} onChange={(e) => setEditEntry({ ...editEntry, locationId: e.target.value })} className="w-32 border border-input rounded px-2 py-1 text-sm bg-background">
                                  <option value="">—</option>
                                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                                <Input value={editEntry.notes} onChange={(e) => setEditEntry({ ...editEntry, notes: e.target.value })} placeholder="Note" className="h-7 w-32 text-sm" />
                                <Button type="submit" size="icon" variant="ghost" className="h-7 w-7 text-success-foreground"><Check size={13} /></Button>
                                <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditEntry(null)}><X size={13} /></Button>
                              </form>
                            </TableCell>
                          </TableRow>
                        );
                      }
                      return (
                        <TableRow key={entry.id} className="group">
                          <TableCell>
                            <div className="font-medium text-sm">{entry.member.person.name}</div>
                            {entry.member.department === "CAST" ? (
                              <div className="text-xs text-muted-foreground italic">
                                {(entry.characterName ?? entry.member.characterName) || "—"}
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground italic">{entry.member.roleTitle}</div>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{entry.startTime} – {entry.endTime}</TableCell>
                          <TableCell className="text-sm">{entry.activity}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{entry.location?.name ?? "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{entry.notes ?? "—"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground"
                                onClick={() => setEditEntry({ id: entry.id, startTime: entry.startTime, endTime: entry.endTime, activity: entry.activity, locationId: entry.location?.id ?? "", notes: entry.notes ?? "", characterName: entry.characterName ?? entry.member.characterName ?? "" })}>
                                <Pencil size={12} />
                              </Button>
                              <Button size="icon" variant="ghost-destructive" className="h-7 w-7"
                                onClick={() => deleteEntry(entry.id, entry.member.person.name)}>
                                <Trash2 size={12} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            );
          })}
        </div>

        </CardContent>
      </Card>

      {/* Eventi collaterali */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Eventi collaterali</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-3 space-y-2">
          {showExtraEvents && editingExtraEvents && (
            <>
              <textarea
                autoFocus
                value={extraEventsValue}
                onChange={(e) => handleExtraEventsChange(e.target.value)}
                placeholder="Es. OPERA INTRO ore 15.00 in Foyer Erker - Moderatore: Diego Villegas"
                rows={4}
                className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <Button size="sm" onClick={() => saveExtraEventsNow(latestExtraEvents.current)}>Salva</Button>
            </>
          )}
          {showExtraEvents && !editingExtraEvents && (
            <div className="group flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/40">
              <p className="flex-1 text-sm whitespace-pre-wrap">{extraEventsValue}</p>
              <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={() => setEditingExtraEvents(true)}>
                <Pencil size={11} />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground hover:text-destructive" onClick={() => saveExtraEventsNow("")}>
                <Trash2 size={11} />
              </Button>
            </div>
          )}
          {!showExtraEvents && (
            <button onClick={() => { setShowExtraEvents(true); setEditingExtraEvents(true); }} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors pb-1">
              <Plus size={13} /> Aggiungi evento collaterale
            </button>
          )}
        </CardContent>
      </Card>

      {/* Note */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Note</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-3 space-y-2">
          {showNotes && editingNotes && (
            <>
              <textarea
                autoFocus
                value={notesValue}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Scrivi una nota..."
                rows={4}
                className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <Button size="sm" onClick={() => saveNotesNow(latestNotes.current)}>Salva</Button>
            </>
          )}
          {showNotes && !editingNotes && (
            <div className="group flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/40">
              <p className="flex-1 text-sm whitespace-pre-wrap">{notesValue}</p>
              <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={() => setEditingNotes(true)}>
                <Pencil size={11} />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground hover:text-destructive" onClick={() => saveNotesNow("")}>
                <Trash2 size={11} />
              </Button>
            </div>
          )}
          {!showNotes && (
            <button onClick={() => { setShowNotes(true); setEditingNotes(true); }} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors pb-1">
              <Plus size={13} /> Aggiungi nota
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
