"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Building2, ChevronDown, MapPin, Pencil, Plus, Search, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import ConfirmDialog from "@/components/ConfirmDialog";
import { FormField } from "@/components/ui/form-field";

type Location = { id: string; name: string };
type TheatreProduction = { id: string; title: string; composer?: string | null; startDate?: string | null; endDate?: string | null };
type Theatre = {
  id: string; name: string; city: string; logoUrl?: string | null;
  locations: Location[];
  productions: TheatreProduction[];
  _count: { productions: number };
};
type WikiResult = { title: string; thumbnail?: string; description?: string };
type EditState = { id: string; name: string; city: string; logoUrl: string };
type ConfirmState = { open: boolean; title: string; description: string; onConfirm: () => void };

const defaultConfirm: ConfirmState = { open: false, title: "", description: "", onConfirm: () => {} };

async function searchWikipedia(query: string): Promise<WikiResult[]> {
  const search = await fetch(
    `https://it.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query + " teatro")}&format=json&origin=*&srlimit=4`
  ).then((r) => r.json());

  const titles: string[] = search.query?.search?.map((s: { title: string }) => s.title) ?? [];
  const results: WikiResult[] = [];

  for (const title of titles.slice(0, 4)) {
    const summary = await fetch(
      `https://it.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
    ).then((r) => r.json()).catch(() => null);
    if (summary?.thumbnail?.source) {
      results.push({ title, thumbnail: summary.thumbnail.source, description: summary.description });
    }
    if (results.length >= 3) break;
  }
  return results;
}

export default function TheatresClient({ initialTheatres }: { initialTheatres: Theatre[] }) {
  const [theatres, setTheatres] = useState<Theatre[]>(initialTheatres);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", city: "" });
  const [locationForms, setLocationForms] = useState<Record<string, string>>({});
  const [showAddLocation, setShowAddLocation] = useState<Record<string, boolean>>({});
  const [editState, setEditState] = useState<EditState | null>(null);
  const [wikiResults, setWikiResults] = useState<WikiResult[]>([]);
  const [wikiLoading, setWikiLoading] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(defaultConfirm);
  const [expandedProductions, setExpandedProductions] = useState<Set<string>>(new Set());

  const load = () => fetch("/api/theatres").then((r) => r.json()).then(setTheatres);

  const toggleProductions = (id: string) =>
    setExpandedProductions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const createTheatre = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/theatres", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ name: "", city: "" });
    setShowForm(false);
    load();
  };

  const saveEdit = async () => {
    if (!editState) return;
    await fetch(`/api/theatres/${editState.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editState.name, city: editState.city, logoUrl: editState.logoUrl || null }),
    });
    setEditState(null);
    setWikiResults([]);
    load();
  };

  const searchImages = async () => {
    if (!editState) return;
    setWikiLoading(true);
    setWikiResults([]);
    const results = await searchWikipedia(editState.name);
    setWikiResults(results);
    setWikiLoading(false);
  };

  const deleteTheatre = (t: Theatre) => setConfirm({
    open: true,
    title: "Eliminare teatro?",
    description: `Eliminare "${t.name}" e tutte le produzioni collegate? L'azione è irreversibile.`,
    onConfirm: async () => {
      await fetch(`/api/theatres/${t.id}`, { method: "DELETE" });
      setConfirm(defaultConfirm);
      load();
    },
  });

  const addLocation = async (theatreId: string) => {
    const name = locationForms[theatreId]?.trim();
    if (!name) return;
    await fetch(`/api/theatres/${theatreId}/locations`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setLocationForms((prev) => ({ ...prev, [theatreId]: "" }));
    load();
  };

  const deleteLocation = async (theatreId: string, locationId: string) => {
    await fetch(`/api/theatres/${theatreId}/locations`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId }),
    });
    load();
  };

  return (
    <div className="space-y-4">
      <ConfirmDialog {...confirm} destructive confirmLabel="Elimina" onCancel={() => setConfirm(defaultConfirm)} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Teatri</h1>
          <p className="text-muted-foreground mt-0.5">Sedi e sale del tuo repertorio</p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditState(null); }}>
          <Plus size={16} /> Nuovo teatro
        </Button>
      </div>

      {/* New theatre form */}
      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={createTheatre} className="space-y-3">
              <p className="text-sm font-semibold">Nuovo teatro</p>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Nome *">
                  <Input required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Teatro alla Scala" />
                </FormField>
                <FormField label="Città *">
                  <Input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Milano" />
                </FormField>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm">Crea</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>Annulla</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Theatre list */}
      {theatres.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Building2 size={32} className="mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Nessun teatro ancora.</p>
            <button onClick={() => setShowForm(true)} className="text-sm text-primary hover:underline mt-1">
              Aggiungi il primo teatro →
            </button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {theatres.map((t) => {
            const isEditing = editState?.id === t.id;
            const isExpanded = expandedProductions.has(t.id);
            const hasProductions = t._count.productions > 0;

            return (
              <Card key={t.id} className="overflow-hidden">
                {/* Main row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Logo / icon */}
                  <div className="shrink-0">
                    {t.logoUrl
                      ? <Image src={t.logoUrl} alt={t.name} width={36} height={36} className="rounded object-cover" />
                      : <div className="w-9 h-9 rounded bg-muted flex items-center justify-center"><Building2 size={16} className="text-muted-foreground" /></div>}
                  </div>

                  {/* Name + city + locations */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{t.name}</span>
                      <span className="text-xs text-muted-foreground">{t.city}</span>
                    </div>
                    {t.locations.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {t.locations.map((loc) => (
                          <Badge key={loc.id} variant="secondary" className="gap-1 pr-1 text-xs font-normal">
                            <MapPin size={9} className="shrink-0" /> {loc.name}
                            <button
                              onClick={() => deleteLocation(t.id, loc.id)}
                              className="ml-0.5 hover:text-destructive leading-none transition-colors"
                            >×</button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right side: production count + actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {hasProductions && (
                      <button
                        onClick={() => toggleProductions(t.id)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted/50"
                      >
                        <span className="font-medium tabular-nums">{t._count.productions}</span>
                        <span>{t._count.productions === 1 ? "produzione" : "produzioni"}</span>
                        <ChevronDown size={12} className={`transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
                      </button>
                    )}
                    {!hasProductions && (
                      <span className="text-xs text-muted-foreground/50 px-2">0 produzioni</span>
                    )}

                    <TooltipProvider>
                      <div className="flex gap-0.5">
                        <Tooltip>
                          <TooltipTrigger render={<span />}>
                            <Button variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => setShowAddLocation((prev) => ({ ...prev, [t.id]: !prev[t.id] }))}>
                              <Plus size={13} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Aggiungi sala</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger render={<span />}>
                            <Button variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => { setEditState({ id: t.id, name: t.name, city: t.city, logoUrl: t.logoUrl ?? "" }); setWikiResults([]); }}>
                              <Pencil size={13} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Modifica</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger render={<span />}>
                            <Button variant="ghost-destructive" size="icon" className="h-7 w-7"
                              onClick={() => deleteTheatre(t)}>
                              <Trash2 size={13} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Elimina</TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  </div>
                </div>

                {/* Add location inline */}
                {showAddLocation[t.id] && (
                  <div className="px-4 pb-3 flex gap-2 max-w-sm">
                    <Input
                      autoFocus
                      value={locationForms[t.id] ?? ""}
                      onChange={(e) => setLocationForms((prev) => ({ ...prev, [t.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { addLocation(t.id); setShowAddLocation((prev) => ({ ...prev, [t.id]: false })); }
                        if (e.key === "Escape") setShowAddLocation((prev) => ({ ...prev, [t.id]: false }));
                      }}
                      placeholder="Nome sala…"
                      className="h-8 text-sm"
                    />
                    <Button size="sm" onClick={() => { addLocation(t.id); setShowAddLocation((prev) => ({ ...prev, [t.id]: false })); }}>
                      Aggiungi
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowAddLocation((prev) => ({ ...prev, [t.id]: false }))}>
                      <X size={13} />
                    </Button>
                  </div>
                )}

                {/* Edit form */}
                {isEditing && editState && (
                  <>
                    <Separator />
                    <div className="px-4 py-3 space-y-3 bg-muted/20">
                      <div className="grid grid-cols-2 gap-3">
                        <FormField label="Nome">
                          <Input value={editState.name} onChange={(e) => setEditState({ ...editState, name: e.target.value })} />
                        </FormField>
                        <FormField label="Città">
                          <Input value={editState.city} onChange={(e) => setEditState({ ...editState, city: e.target.value })} />
                        </FormField>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={searchImages} disabled={wikiLoading}>
                        <Search size={13} /> {wikiLoading ? "Ricerca…" : "Cerca immagine su Wikipedia"}
                      </Button>
                      {wikiResults.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Seleziona un'immagine:</p>
                          <div className="flex gap-3 flex-wrap">
                            {wikiResults.map((r) => (
                              <button
                                key={r.title}
                                onClick={() => setEditState({ ...editState, logoUrl: r.thumbnail! })}
                                className={`rounded-lg overflow-hidden border-2 transition-colors ${editState.logoUrl === r.thumbnail ? "border-primary" : "border-transparent hover:border-border"}`}
                              >
                                <Image src={r.thumbnail!} alt={r.title} width={80} height={80} className="object-cover" />
                                <p className="text-xs text-center p-1 max-w-20 truncate">{r.title}</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {wikiResults.length === 0 && !wikiLoading && editState.logoUrl && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Anteprima:</p>
                          <Image src={editState.logoUrl} alt="preview" width={80} height={80} className="rounded object-cover border" />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEdit}><Check size={13} /> Salva</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setEditState(null); setWikiResults([]); }}><X size={13} /> Annulla</Button>
                      </div>
                    </div>
                  </>
                )}

                {/* Productions — collapsed by default */}
                {isExpanded && hasProductions && (
                  <>
                    <Separator />
                    <div className="divide-y">
                      {t.productions.map((p) => {
                        const dateRange = p.startDate
                          ? new Date(p.startDate).toLocaleDateString("it-IT", { day: "numeric", month: "long" }) +
                            (p.endDate ? ` → ${new Date(p.endDate).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}` : "")
                          : null;
                        return (
                          <Link
                            key={p.id}
                            href={`/productions/${p.id}`}
                            className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/30 transition-colors"
                          >
                            <div className="min-w-0">
                              <span className="font-medium">{p.title}</span>
                              {p.composer && <span className="text-muted-foreground ml-1.5 text-xs">— {p.composer}</span>}
                            </div>
                            {dateRange && <span className="text-xs text-muted-foreground shrink-0 ml-4">{dateRange}</span>}
                          </Link>
                        );
                      })}
                    </div>
                  </>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
