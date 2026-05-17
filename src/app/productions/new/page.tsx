"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Theatre = { id: string; name: string; city: string };

export default function NewProductionPage() {
  const router = useRouter();
  const [theatres, setTheatres] = useState<Theatre[]>([]);
  const [form, setForm] = useState({ title: "", composer: "", theatreId: "", startDate: "", endDate: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/theatres").then((r) => r.json()).then(setTheatres);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/productions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const production = await res.json();
    router.push(`/productions/${production.id}`);
  };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Link href="/productions" className="hover:text-foreground">Produzioni</Link>
          <ChevronRight size={14} />
          <span>Nuova</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Nuova produzione</h1>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Dati dell&apos;opera</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Titolo *</label>
              <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="I Viaggi di Gulliver" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Compositore / Autore</label>
              <Input value={form.composer} onChange={(e) => setForm({ ...form, composer: e.target.value })} placeholder="B. Moretti" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Teatro *</label>
              {theatres.length === 0 ? (
                <p className="text-sm text-amber-600">
                  Nessun teatro disponibile. <Link href="/theatres" className="underline">Aggiungine uno prima.</Link>
                </p>
              ) : (
                <select
                  required value={form.theatreId}
                  onChange={(e) => setForm({ ...form, theatreId: e.target.value })}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Seleziona teatro...</option>
                  {theatres.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.city}</option>)}
                </select>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Data inizio</label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Data fine</label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={loading || !form.theatreId}>
                {loading ? "Salvataggio..." : "Crea produzione"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.back()}>Annulla</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
