"use client";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Props = {
  id: string;
  title: string;
  composer?: string | null;
  theatreName: string;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  lastOdgDate?: string | Date | null;
  memberCount?: number;
  odgCount?: number;
  isActive?: boolean;
  isFuture?: boolean;
};

export default function ProductionCard({ id, title, composer, theatreName, startDate, endDate, lastOdgDate, memberCount, odgCount, isActive, isFuture }: Props) {
  const fmt = (d: string | Date, opts: Intl.DateTimeFormatOptions) =>
    new Date(d).toLocaleDateString("it-IT", opts);

  const dateLabel = startDate
    ? `${fmt(startDate, { day: "numeric", month: "long", year: "numeric" })}${endDate ? ` → ${fmt(endDate, { day: "numeric", month: "long" })}` : ""}`
    : lastOdgDate
      ? `Ultimo ODG: ${fmt(lastOdgDate, { day: "numeric", month: "long" })}`
      : "Date non impostate";

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="pt-4">
        <Link href={`/productions/${id}`} className="block group">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold group-hover:underline">{title}</h3>
              {composer && <p className="text-sm text-muted-foreground">{composer}</p>}
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant="secondary" className="text-xs">{theatreName}</Badge>
              {isActive && <Badge variant="warning" className="text-xs">In scena</Badge>}
              {isFuture && <Badge variant="info" className="text-xs">In programma</Badge>}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 mt-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
              <CalendarDays size={11} className="shrink-0" />
              <span className="truncate">{dateLabel}</span>
            </div>
            {(memberCount !== undefined || odgCount !== undefined) && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                {memberCount !== undefined && <span>{memberCount} art.</span>}
                {odgCount !== undefined && <span>{odgCount} ODG</span>}
              </div>
            )}
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
