"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function DeleteProductionButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleDelete() {
    await fetch(`/api/productions/${id}`, { method: "DELETE" });
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button variant="ghost-destructive" size="icon" className="ml-2 shrink-0" onClick={() => setOpen(true)}>
        <Trash2 size={15} />
      </Button>
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
