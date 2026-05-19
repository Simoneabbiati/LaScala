"use client";
import { useEffect, useState } from "react";
import { Building2, MapPin, Pencil, Plus, Search, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import ConfirmDialog from "@/components/ConfirmDialog";

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

  const titles: string[] = search.query?.search?.map((s: any) => s.title) ?? [];
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

export default function TheatresPage() {
  const [theatres, setTheatres] = useState<Theatre[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", city: "" });
  const [locationForms, setLocationForms] = useState<Record<string, string>>({});
  const [showAddLocation, setShowAddLocation] = useState<Record<string, boolean>>({});
  const [editState, setEditState] = useState<EditState | null>(null);
  const [wikiResults, setWikiResults] = useState<WikiResult[]>([]);
  const [wikiLoading, setWikiLoading] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(defaultConfirm);

  const load = () => fetch("/api/theatres").then((r) => r.json()).then(setTheatres);
  useEffect(() => { load(); }, []);

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
    <div className="space-y-6">
      <ConfirmDialog {...confirm} destructive confirmLabel="Elimina" onCancel={() => setConfirm(defaultConfirm)} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Teatri</h1>
          <p className="text-muted-foreground mt-1">Gestisci teatri e le loro sale</p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus size={16} /> Nuovo teatro</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">Nuovo teatro</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={createTheatre} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Nome teatro *</label>
                  <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Teatro alla Scala" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Città *</label>
                  <Input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Milano" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">Crea</Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Annulla</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {theatres.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nessun teatro ancora.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {theatres.map((t) => {
            const isEditing = editState?.id === t.id;
            return (
              <Card key={t.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {t.logoUrl
                        ? <img src={t.logoUrl} alt={t.name} className="w-10 h-10 rounded object-cover shrink-0 mt-0.5" />
                        : <Building2 size={18} className="text-muted-foreground shrink-0 mt-1" />}
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base">{t.name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-0.5">{t.city} · {t._count.productions} produzioni</p>
                        {t.locations.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {t.locations.map((loc) => (
                              <Badge key={loc.id} variant="secondary" className="gap-1 pr-1 text-xs">
                                <MapPin size={9} /> {loc.name}
                                <button onClick={() => deleteLocation(t.id, loc.id)} className="ml-1 hover:text-destructive leading-none">×</button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <TooltipProvider>
                    <div className="flex gap-1 shrink-0">
                      <Tooltip>
                        <TooltipTrigger >
                          <Button variant="ghost" size="icon" onClick={() => setShowAddLocation((prev) => ({ ...prev, [t.id]: !prev[t.id] }))}>
                            <Plus size={14} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Aggiungi sala</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger >
                          <Button variant="ghost" size="icon" onClick={() => {
                            setEditState({ id: t.id, name: t.name, city: t.city, logoUrl: t.logoUrl ?? "" });
                            setWikiResults([]);
                          }}>
                            <Pencil size={14} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Modifica teatro</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger >
                          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => deleteTheatre(t)}>
                            <Trash2 size={15} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Elimina teatro</TooltipContent>
                      </Tooltip>
                    </div>
                    </TooltipProvider>
                  </div>

                  {showAddLocation[t.id] && (
                    <div className="flex gap-2 mt-3 max-w-sm">
                      <Input
                        autoFocus
                        value={locationForms[t.id] ?? ""}
                        onChange={(e) => setLocationForms((prev) => ({ ...prev, [t.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") { addLocation(t.id); setShowAddLocation((prev) => ({ ...prev, [t.id]: false })); } if (e.key === "Escape") setShowAddLocation((prev) => ({ ...prev, [t.id]: false })); }}
                        placeholder="Nome sala..."
                        className="h-8 text-sm"
                      />
                      <Button size="sm" onClick={() => { addLocation(t.id); setShowAddLocation((prev) => ({ ...prev, [t.id]: false })); }}>Aggiungi</Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowAddLocation((prev) => ({ ...prev, [t.id]: false }))}><X size={13} /></Button>
                    </div>
                  )}

                  {isEditing && editState && (
                    <div className="mt-4 space-y-3 border-t pt-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Nome</label>
                          <Input value={editState.name} onChange={(e) => setEditState({ ...editState, name: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Città</label>
                          <Input value={editState.city} onChange={(e) => setEditState({ ...editState, city: e.target.value })} />
                        </div>
                      </div>

                      <Button type="button" variant="outline" onClick={searchImages} disabled={wikiLoading}>
                        <Search size={14} /> {wikiLoading ? "Ricerca in corso..." : "Cerca immagine su Wikipedia"}
                      </Button>

                      {wikiResults.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Clicca un'immagine per selezionarla:</p>
                          <div className="flex gap-3 flex-wrap">
                            {wikiResults.map((r) => (
                              <button
                                key={r.title}
                                onClick={() => setEditState({ ...editState, logoUrl: r.thumbnail! })}
                                className={`rounded-lg overflow-hidden border-2 transition-colors ${editState.logoUrl === r.thumbnail ? "border-primary" : "border-transparent hover:border-border"}`}
                              >
                                <img src={r.thumbnail} alt={r.title} className="w-24 h-24 object-cover" />
                                <p className="text-xs text-center p-1 max-w-24 truncate">{r.title}</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {wikiResults.length === 0 && !wikiLoading && editState.logoUrl && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Anteprima:</p>
                          <img src={editState.logoUrl} alt="preview" className="w-24 h-24 rounded object-cover border" />
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEdit}><Check size={13} /> Salva</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setEditState(null); setWikiResults([]); }}><X size={13} /> Annulla</Button>
                      </div>
                    </div>
                  )}
                </CardHeader>

                {t.productions.length > 0 && (
                  <>
                    <Separator />
                    <CardContent className="pt-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Produzioni</p>
                      <div className="divide-y rounded-lg border overflow-hidden">
                        {t.productions.map((p) => {
                          const year = p.startDate ? new Date(p.startDate).getFullYear() : null;
                          const dateRange = p.startDate
                            ? new Date(p.startDate).toLocaleDateString("it-IT", { day: "numeric", month: "long" }) +
                              (p.endDate ? ` → ${new Date(p.endDate).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}` : ` ${year}`)
                            : null;
                          return (
                            <div key={p.id} className="flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/30 transition-colors">
                              <div>
                                <span className="font-medium">{p.title}</span>
                                {p.composer && <span className="text-muted-foreground ml-1.5 text-xs">— {p.composer}</span>}
                              </div>
                              {dateRange && <span className="text-xs text-muted-foreground shrink-0 ml-4">{dateRange}</span>}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
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
