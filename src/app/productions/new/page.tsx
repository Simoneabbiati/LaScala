"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import OperaTitleInput, { type OperaResult } from "@/components/OperaTitleInput";

type Theatre = { id: string; name: string; city: string };
type CastSlot = { characterName: string; voiceType: string; personName: string };

export default function NewProductionPage() {
  const router = useRouter();
  const [theatres, setTheatres] = useState<Theatre[]>([]);
  const [form, setForm] = useState({
    title: "",
    composer: "",
    theatreId: "",
    startDate: "",
    endDate: "",
  });
  const [castSlots, setCastSlots] = useState<CastSlot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/theatres").then((r) => r.json()).then(setTheatres);
  }, []);

  const handleOperaSelect = (opera: OperaResult) => {
    setForm((f) => ({
      ...f,
      title: opera.title,
      composer: opera.composer ?? f.composer,
    }));
    setCastSlots(
      opera.characters.map((c) => ({
        characterName: c.name,
        voiceType: c.voiceType ?? "",
        personName: "",
      }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/productions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const production = await res.json();

    // Create placeholder cast members (no person assigned yet)
    if (castSlots.length > 0) {
      await Promise.all(
        castSlots.map((slot) =>
          fetch(`/api/productions/${production.id}/members`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              personName: slot.personName || null,
              department: "CAST",
              roleTitle: slot.voiceType || "Cantante",
              characterName: slot.characterName,
            }),
          })
        )
      );
    }

    router.push(`/productions/${production.id}`);
  };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Link href="/productions" className="hover:text-foreground">
            Produzioni
          </Link>
          <ChevronRight size={14} />
          <span>Nuova</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Nuova produzione</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dati dell&apos;opera</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Titolo *</label>
              <OperaTitleInput
                required
                value={form.title}
                onChange={(v) => setForm({ ...form, title: v })}
                onSelect={handleOperaSelect}
                placeholder="La traviata..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Compositore / Autore
              </label>
              <Input
                value={form.composer}
                onChange={(e) =>
                  setForm({ ...form, composer: e.target.value })
                }
                placeholder="G. Verdi"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Teatro *</label>
              {theatres.length === 0 ? (
                <p className="text-sm text-amber-600">
                  Nessun teatro disponibile.{" "}
                  <Link href="/theatres" className="underline">
                    Aggiungine uno prima.
                  </Link>
                </p>
              ) : (
                <select
                  required
                  value={form.theatreId}
                  onChange={(e) =>
                    setForm({ ...form, theatreId: e.target.value })
                  }
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Seleziona teatro...</option>
                  {theatres.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.city}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Data inizio</label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm({ ...form, startDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Data fine</label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm({ ...form, endDate: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                disabled={loading || !form.theatreId}
              >
                {loading ? "Salvataggio..." : "Crea produzione"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
              >
                Annulla
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Cast roster pre-populated from opera */}
      {castSlots.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Cast — {castSlots.length} personaggi
              </CardTitle>
              <button
                type="button"
                onClick={() => setCastSlots([])}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Aggiungi il nome dell&apos;artista, oppure lascia vuoto — il
              direttore di scena potrà completare il roster in seguito.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {castSlots.map((slot, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2"
                >
                  <span className="text-sm font-medium truncate">
                    {slot.characterName}
                  </span>
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded whitespace-nowrap">
                    {slot.voiceType || "—"}
                  </span>
                  <Input
                    value={slot.personName}
                    onChange={(e) => {
                      const updated = [...castSlots];
                      updated[i] = { ...slot, personName: e.target.value };
                      setCastSlots(updated);
                    }}
                    placeholder="Nome artista..."
                    className="h-8 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setCastSlots(castSlots.filter((_, j) => j !== i))
                    }
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
