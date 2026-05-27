export type SessionGroup<T> = {
  locationId: string | null;
  locationName: string;
  sessions: T[];
  firstStart: string;
};

type Groupable = {
  startTime: string;
  endTime: string;
  location?: { id: string; name: string } | null;
};

/**
 * Groups ODG sessions by location, sorts each group by start time (then end
 * time), and orders groups by earliest start. The "no location" group is
 * always last. Mirrors the ordering used by the "Programma del giorno" UI so
 * that exports stay consistent with what the user sees on screen.
 */
export function groupSessionsByLocation<T extends Groupable>(sessions: T[]): SessionGroup<T>[] {
  const byLoc = new Map<string | null, T[]>();
  for (const s of sessions) {
    const key = s.location?.id ?? null;
    const list = byLoc.get(key);
    if (list) list.push(s);
    else byLoc.set(key, [s]);
  }

  const groups: SessionGroup<T>[] = [];
  for (const [locId, list] of byLoc) {
    list.sort((a, b) => {
      if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
      return a.endTime.localeCompare(b.endTime);
    });
    groups.push({
      locationId: locId,
      locationName: list[0].location?.name ?? "Senza luogo",
      sessions: list,
      firstStart: list[0].startTime,
    });
  }

  groups.sort((a, b) => {
    if (a.locationId === null) return 1;
    if (b.locationId === null) return -1;
    return a.firstStart.localeCompare(b.firstStart);
  });

  return groups;
}

/** Returns sessions sorted the same way they appear in "Programma del giorno". */
export function sortSessionsLikeProgram<T extends Groupable>(sessions: T[]): T[] {
  return groupSessionsByLocation(sessions).flatMap((g) => g.sessions);
}
