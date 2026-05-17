"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ConfirmDialog";

type Props = {
  id: string;
  title: string;
  composer?: string | null;
  theatreName: string;
  lastOdgDate?: string | null;
};

export default function ProductionCard({ id, title, composer, theatreName, lastOdgDate }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleDelete() {
    await fetch(`/api/productions/${id}`, { method: "DELETE" });
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Card className="hover:shadow-sm transition-shadow">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2">
            <Link href={`/productions/${id}`} className="block group flex-1 min-w-0">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold group-hover:underline">{title}</h3>
                  {composer && <p className="text-sm text-muted-foreground">{composer}</p>}
                </div>
                <Badge variant="secondary">{theatreName}</Badge>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays size={11} />
                {lastOdgDate
                  ? `Ultimo ODG: ${new Date(lastOdgDate).toLocaleDateString("it-IT", { day: "numeric", month: "long" })}`
                  : "Nessun ODG ancora"}
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => setOpen(true)}
            >
              <Trash2 size={15} />
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={open}
        title="Elimina produzione"
        description={`Vuoi eliminare "${title}"? Questa azione è irreversibile e cancellerà tutti gli ODG associati.`}
        confirmLabel="Elimina"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
