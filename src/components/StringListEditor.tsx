"use client";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type StringItem = { id?: string; name: string };

interface Props {
  label: string;
  items: StringItem[];
  onChange: (items: StringItem[]) => void;
  placeholder?: string;
}

export default function StringListEditor({ label, items, onChange, placeholder }: Props) {
  const update = (i: number, patch: Partial<StringItem>) => {
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, { name: "" }]);
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">Nessuna voce. Aggiungine una.</p>
      )}
      {items.map((it, i) => (
        <div key={it.id ?? `new-${i}`} className="flex items-center gap-2">
          <Input
            value={it.name}
            placeholder={placeholder}
            onChange={(e) => update(i, { name: e.target.value })}
            aria-label={`${label} #${i + 1}`}
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Sposta su">
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Sposta giù">
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} aria-label="Rimuovi">
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="mr-2 h-4 w-4" />
        Aggiungi
      </Button>
    </div>
  );
}
