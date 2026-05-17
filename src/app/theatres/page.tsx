"use client";
import { useEffect, useState } from "react";
import { Building2, MapPin, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type Location = { id: string; name: string };
type Theatre = {
  id: string; name: string; city: string;
  locations: Location[];
  _count: { productions: number };
};

export default function TheatresPage() {
  const [theatres, setTheatres] = useState<Theatre[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", city: "" });
  const [locationForms, setLocationForms] = useState<Record<string, string>>({});

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

  const deleteTheatre = async (id: string) => {
    if (!confirm("Eliminare questo teatro e tutte le produzioni collegate?")) return;
    await fetch(`/api/theatres/${id}`, { method: "DELETE" });
    load();
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Teatri</h1>
          <p className="text-muted-foreground mt-1">Gestisci teatri e le loro sale</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={16} /> Nuovo teatro
        </Button>
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
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nessun teatro ancora. Aggiungine uno.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {theatres.map((t) => (
            <Card key={t.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 size={18} className="text-muted-foreground" />
                    <div>
                      <CardTitle className="text-base">{t.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-0.5">{t.city} · {t._count.productions} produzioni</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteTheatre(t.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 size={15} />
                  </Button>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Sale / Luoghi</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {t.locations.map((loc) => (
                    <Badge key={loc.id} variant="secondary" className="gap-1 pr-1">
                      <MapPin size={10} /> {loc.name}
                      <button onClick={() => deleteLocation(t.id, loc.id)} className="ml-1 hover:text-destructive">×</button>
                    </Badge>
                  ))}
                  {t.locations.length === 0 && <p className="text-sm text-muted-foreground">Nessuna sala aggiunta.</p>}
                </div>
                <div className="flex gap-2 max-w-sm">
                  <Input
                    value={locationForms[t.id] ?? ""}
                    onChange={(e) => setLocationForms((prev) => ({ ...prev, [t.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && addLocation(t.id)}
                    placeholder="Nuova sala..."
                    className="h-8 text-sm"
                  />
                  <Button size="sm" variant="outline" onClick={() => addLocation(t.id)}>Aggiungi</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
