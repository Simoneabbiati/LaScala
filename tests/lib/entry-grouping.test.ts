import { describe, it, expect } from "vitest";
import { groupEntriesByLocation } from "@/lib/entry-grouping";

type TestEntry = {
  id: string;
  startTime: string;
  endTime: string;
  location?: { id: string; name: string };
  member: { person: { name: string } | null; roleTitle: string };
};

const e = (
  id: string,
  startTime: string,
  endTime: string,
  loc: { id: string; name: string } | undefined,
  name: string | null,
  roleTitle = "Ruolo",
): TestEntry => ({
  id,
  startTime,
  endTime,
  location: loc,
  member: { person: name ? { id: "p", name } : null, roleTitle } as TestEntry["member"],
});

const PALCO = { id: "loc-1", name: "Palcoscenico" };
const SALA = { id: "loc-2", name: "Sala Prova A" };

describe("groupEntriesByLocation", () => {
  it("returns empty array for empty input", () => {
    expect(groupEntriesByLocation<TestEntry>([])).toEqual([]);
  });

  it("groups entries by locationId", () => {
    const result = groupEntriesByLocation<TestEntry>([
      e("a", "10:00", "11:00", PALCO, "Anna"),
      e("b", "10:30", "11:00", SALA, "Bruno"),
      e("c", "11:00", "12:00", PALCO, "Carla"),
    ]);
    expect(result).toHaveLength(2);
    const palco = result.find((g) => g.locationId === "loc-1")!;
    const sala = result.find((g) => g.locationId === "loc-2")!;
    expect(palco.entries.map((x) => x.id)).toEqual(["a", "c"]);
    expect(sala.entries.map((x) => x.id)).toEqual(["b"]);
  });

  it("uses location.name as group label", () => {
    const result = groupEntriesByLocation<TestEntry>([
      e("a", "10:00", "11:00", PALCO, "Anna"),
    ]);
    expect(result[0].locationName).toBe("Palcoscenico");
  });

  it("sorts entries inside each group by startTime ascending", () => {
    const result = groupEntriesByLocation<TestEntry>([
      e("a", "11:00", "12:00", PALCO, "Anna"),
      e("b", "09:00", "10:00", PALCO, "Bruno"),
      e("c", "10:00", "11:00", PALCO, "Carla"),
    ]);
    expect(result[0].entries.map((x) => x.id)).toEqual(["b", "c", "a"]);
  });

  it("breaks startTime ties by endTime ascending", () => {
    const result = groupEntriesByLocation<TestEntry>([
      e("a", "10:00", "12:00", PALCO, "Anna"),
      e("b", "10:00", "11:00", PALCO, "Bruno"),
    ]);
    expect(result[0].entries.map((x) => x.id)).toEqual(["b", "a"]);
  });

  it("breaks startTime+endTime ties by person name ascending", () => {
    const result = groupEntriesByLocation<TestEntry>([
      e("a", "10:00", "11:00", PALCO, "Zoe"),
      e("b", "10:00", "11:00", PALCO, "Anna"),
    ]);
    expect(result[0].entries.map((x) => x.id)).toEqual(["b", "a"]);
  });

  it("falls back to roleTitle when person is null", () => {
    const result = groupEntriesByLocation<TestEntry>([
      e("a", "10:00", "11:00", PALCO, null, "Zebra"),
      e("b", "10:00", "11:00", PALCO, null, "Alfa"),
    ]);
    expect(result[0].entries.map((x) => x.id)).toEqual(["b", "a"]);
  });

  it("orders groups by firstStart ascending", () => {
    const result = groupEntriesByLocation<TestEntry>([
      e("a", "11:00", "12:00", PALCO, "Anna"),
      e("b", "09:00", "10:00", SALA, "Bruno"),
    ]);
    expect(result.map((g) => g.locationId)).toEqual(["loc-2", "loc-1"]);
  });

  it("places 'Senza luogo' group at the end even if its firstStart is earliest", () => {
    const result = groupEntriesByLocation<TestEntry>([
      e("a", "10:00", "11:00", PALCO, "Anna"),
      e("b", "08:00", "09:00", undefined, "Bruno"),
    ]);
    expect(result.map((g) => g.locationId)).toEqual(["loc-1", null]);
    expect(result[1].locationName).toBe("Senza luogo");
  });

  it("works when all entries have no location", () => {
    const result = groupEntriesByLocation<TestEntry>([
      e("a", "10:00", "11:00", undefined, "Anna"),
      e("b", "09:00", "10:00", undefined, "Bruno"),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].locationId).toBeNull();
    expect(result[0].locationName).toBe("Senza luogo");
    expect(result[0].entries.map((x) => x.id)).toEqual(["b", "a"]);
  });
});
