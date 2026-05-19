import { cn } from "@/lib/utils"

function FormField({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1", className)}>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

export { FormField }
