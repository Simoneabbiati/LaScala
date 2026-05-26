export type EntryGroup<T> = {
  locationId: string | null;
  locationName: string;
  entries: T[];
  firstStart: string;
};

type Groupable = {
  startTime: string;
  endTime: string;
  location?: { id: string; name: string };
  member: { person: { name: string } | null; roleTitle: string };
};

/**
 * Groups ODG entries by location, sorts each group by start time, and
 * orders groups by earliest start. The "no location" group is always last.
 */
export function groupEntriesByLocation<T extends Groupable>(entries: T[]): EntryGroup<T>[] {
  const byLoc = new Map<string | null, T[]>();
  for (const entry of entries) {
    const key = entry.location?.id ?? null;
    const list = byLoc.get(key);
    if (list) list.push(entry);
    else byLoc.set(key, [entry]);
  }

  const groups: EntryGroup<T>[] = [];
  for (const [locId, list] of byLoc) {
    list.sort((a, b) => {
      if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
      if (a.endTime !== b.endTime) return a.endTime.localeCompare(b.endTime);
      const aName = a.member.person?.name ?? a.member.roleTitle;
      const bName = b.member.person?.name ?? b.member.roleTitle;
      return aName.localeCompare(bName);
    });
    groups.push({
      locationId: locId,
      locationName: list[0].location?.name ?? "Senza luogo",
      entries: list,
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
