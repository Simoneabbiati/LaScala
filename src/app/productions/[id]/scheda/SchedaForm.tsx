"use client";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StringListEditor, { type StringItem } from "@/components/StringListEditor";

type ActItem = { id?: string; title: string; description: string | null };

export type SchedaInitialData = {
  plot: string | null;
  schedaNotes: string | null;
  acts: { id: string; title: string; description: string | null }[];
  chorusRoles: { id: string; name: string }[];
  interiors: { id: string; name: string }[];
  hazards: { id: string; name: string }[];
};

export type OperaInfo = {
  title: string;
  composer: string | null;
  characters: { id: string; roleTitle: string; characterName: string | null }[];
};

interface Props {
  productionId: string;
  initial: SchedaInitialData;
  opera: OperaInfo;
}

export default function SchedaForm({ productionId, initial, opera }: Props) {
  const [plot, setPlot] = useState(initial.plot ?? "");
  const [schedaNotes, setSchedaNotes] = useState(initial.schedaNotes ?? "");
  const [acts, setActs] = useState<ActItem[]>(initial.acts);
  const [chorusRoles, setChorusRoles] = useState<StringItem[]>(initial.chorusRoles);
  const [interiors, setInteriors] = useState<StringItem[]>(initial.interiors);
  const [hazards, setHazards] = useState<StringItem[]>(initial.hazards);
  const [saving, setSaving] = useState(false);

  const updateAct = (i: number, patch: Partial<ActItem>) => {
    setActs((curr) => curr.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  };
  const removeAct = (i: number) => setActs((curr) => curr.filter((_, idx) => idx !== i));
  const addAct = () => setActs((curr) => [...curr, { title: "", description: null }]);
  const moveAct = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    setActs((curr) => {
      if (j < 0 || j >= curr.length) return curr;
      const next = curr.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const submit = async () => {
    setSaving(true);
    try {
      const body = {
        plot: plot.trim() === "" ? null : plot,
        schedaNotes: schedaNotes.trim() === "" ? null : schedaNotes,
        acts: acts
          .filter((a) => a.title.trim() !== "")
          .map((a) => ({ title: a.title, description: a.description })),
        chorusRoles: chorusRoles.filter((x) => x.name.trim() !== "").map((x) => ({ name: x.name })),
        interiors: interiors.filter((x) => x.name.trim() !== "").map((x) => ({ name: x.name })),
        hazards: hazards.filter((x) => x.name.trim() !== "").map((x) => ({ name: x.name })),
      };
      const res = await fetch(`/api/productions/${productionId}/scheda`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      toast.success("Scheda salvata");
    } catch (e) {
      toast.error(`Errore nel salvataggio: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <Card>
        <CardHeader><CardTitle>Dati dell&apos;opera</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div><span className="font-medium">Titolo:</span> {opera.title}</div>
          <div><span className="font-medium">Compositore:</span> {opera.composer ?? "—"}</div>
          <div>
            <span className="font-medium">Personaggi:</span>{" "}
            {opera.characters.length === 0
              ? "—"
              : opera.characters.map((c) => c.characterName ?? c.roleTitle).join(", ")}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Trama</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={plot} onChange={(e) => setPlot(e.target.value)} rows={8} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Divisione in atti</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {acts.length === 0 && <p className="text-sm text-muted-foreground">Nessun atto. Aggiungine uno.</p>}
          {acts.map((a, i) => (
            <div key={a.id ?? `new-${i}`} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={a.title}
                  placeholder="Titolo (es. Atto I)"
                  onChange={(e) => updateAct(i, { title: e.target.value })}
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => moveAct(i, -1)} disabled={i === 0} aria-label="Sposta su">
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => moveAct(i, 1)} disabled={i === acts.length - 1} aria-label="Sposta giù">
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeAct(i)} aria-label="Rimuovi">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                value={a.description ?? ""}
                placeholder="Descrizione / ambientazione (opzionale)"
                onChange={(e) => updateAct(i, { description: e.target.value === "" ? null : e.target.value })}
                rows={3}
              />
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addAct}>
            <Plus className="mr-2 h-4 w-4" /> Aggiungi atto
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Ruoli del coro</CardTitle></CardHeader>
        <CardContent>
          <StringListEditor label="Ruolo coro" items={chorusRoles} onChange={setChorusRoles} placeholder="Es. Soldati" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Interni</CardTitle></CardHeader>
        <CardContent>
          <StringListEditor label="Interno" items={interiors} onChange={setInteriors} placeholder="Es. Sagrestia" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Hazards (armi / effetti speciali)</CardTitle></CardHeader>
        <CardContent>
          <StringListEditor label="Hazard" items={hazards} onChange={setHazards} placeholder="Es. Pistola scenica" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Note da ricordare</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={schedaNotes} onChange={(e) => setSchedaNotes(e.target.value)} rows={6} />
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-3 flex justify-end">
        <Button onClick={submit} disabled={saving}>
          {saving ? "Salvataggio…" : "Salva scheda"}
        </Button>
      </div>
    </div>
  );
}
