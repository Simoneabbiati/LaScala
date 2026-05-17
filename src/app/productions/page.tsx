"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, CalendarDays, Plus, Trash2, Users } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import ConfirmDialog from "@/components/ConfirmDialog";

type Theatre = { id: string; name: string; city: string };
type Production = {
  id: string; title: string; composer?: string;
  startDate?: string; endDate?: string;
  theatre: Theatre;
  _count: { members: number; odgs: number };
};

type ConfirmState = { open: boolean; id: string; title: string };

export default function ProductionsPage() {
  const router = useRouter();
  const [productions, setProductions] = useState<Production[]>([]);
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false, id: "", title: "" });

  useEffect(() => {
    fetch("/api/productions").then((r) => r.json()).then(setProductions);
  }, []);

  async function handleDelete() {
    await fetch(`/api/productions/${confirm.id}`, { method: "DELETE" });
    setProductions((prev) => prev.filter((p) => p.id !== confirm.id));
    setConfirm({ open: false, id: "", title: "" });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Produzioni</h1>
          <p className="text-muted-foreground mt-1">Tutte le produzioni attive e passate</p>
        </div>
        <Link href="/productions/new" className={cn(buttonVariants())}>
          <Plus size={16} /> Nuova produzione
        </Link>
      </div>

      {productions.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-3">
            <BookOpen size={32} className="text-muted-foreground/40" />
            <p className="text-muted-foreground">Nessuna produzione ancora.</p>
            <Link href="/productions/new" className={cn(buttonVariants({ variant: "link" }))}>
              Crea la prima produzione
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {productions.map((p) => (
            <Card key={p.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between mb-3">
                  <Link href={`/productions/${p.id}`} className="block group flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h2 className="font-bold group-hover:underline">{p.title}</h2>
                        {p.composer && <p className="text-sm text-muted-foreground">{p.composer}</p>}
                      </div>
                      <Badge variant="secondary">{p.theatre.name}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users size={11} /> {p._count.members} artisti</span>
                      <span className="flex items-center gap-1"><CalendarDays size={11} /> {p._count.odgs} ODG</span>
                      {p.startDate && (
                        <span>
                          {new Date(p.startDate).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })}
                          {p.endDate && ` → ${new Date(p.endDate).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}`}
                        </span>
                      )}
                    </div>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-2 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setConfirm({ open: true, id: p.id, title: p.title })}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirm.open}
        title="Elimina produzione"
        description={`Vuoi eliminare "${confirm.title}"? Questa azione è irreversibile e cancellerà tutti gli ODG associati.`}
        confirmLabel="Elimina"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirm({ open: false, id: "", title: "" })}
      />
    </div>
  );
}
