import { describe, it, expect } from "vitest";
import { groupSessionsByLocation, sortSessionsLikeProgram } from "@/lib/session-grouping";

type TestSession = {
  id: string;
  startTime: string;
  endTime: string;
  location?: { id: string; name: string };
};

const s = (
  id: string,
  startTime: string,
  endTime: string,
  loc?: { id: string; name: string },
): TestSession => ({ id, startTime, endTime, location: loc });

const PALCO = { id: "loc-1", name: "Palcoscenico" };
const SALA = { id: "loc-2", name: "Sala Trucco" };

describe("groupSessionsByLocation", () => {
  it("returns empty array for empty input", () => {
    expect(groupSessionsByLocation<TestSession>([])).toEqual([]);
  });

  it("groups sessions by locationId", () => {
    const result = groupSessionsByLocation<TestSession>([
      s("a", "10:00", "14:00", PALCO),
      s("b", "18:00", "20:30", SALA),
      s("c", "15:00", "18:30", PALCO),
    ]);
    expect(result).toHaveLength(2);
    const palco = result.find((g) => g.locationId === "loc-1")!;
    const sala = result.find((g) => g.locationId === "loc-2")!;
    expect(palco.sessions.map((x) => x.id)).toEqual(["a", "c"]);
    expect(sala.sessions.map((x) => x.id)).toEqual(["b"]);
  });

  it("uses location.name as group label", () => {
    const result = groupSessionsByLocation<TestSession>([s("a", "10:00", "14:00", PALCO)]);
    expect(result[0].locationName).toBe("Palcoscenico");
  });

  it("sorts sessions inside each group by startTime ascending", () => {
    const result = groupSessionsByLocation<TestSession>([
      s("a", "20:45", "23:59", PALCO),
      s("b", "10:00", "14:00", PALCO),
      s("c", "15:00", "18:30", PALCO),
    ]);
    expect(result[0].sessions.map((x) => x.id)).toEqual(["b", "c", "a"]);
  });

  it("breaks startTime ties by endTime ascending", () => {
    const result = groupSessionsByLocation<TestSession>([
      s("a", "10:00", "14:00", PALCO),
      s("b", "10:00", "12:00", PALCO),
    ]);
    expect(result[0].sessions.map((x) => x.id)).toEqual(["b", "a"]);
  });

  it("orders groups by firstStart ascending", () => {
    const result = groupSessionsByLocation<TestSession>([
      s("a", "18:00", "20:30", SALA),
      s("b", "10:00", "14:00", PALCO),
    ]);
    expect(result.map((g) => g.locationId)).toEqual(["loc-1", "loc-2"]);
  });

  it("places the no-location group at the end even if its firstStart is earliest", () => {
    const result = groupSessionsByLocation<TestSession>([
      s("a", "10:00", "14:00", PALCO),
      s("b", "08:00", "09:00", undefined),
    ]);
    expect(result.map((g) => g.locationId)).toEqual(["loc-1", null]);
    expect(result[1].locationName).toBe("Senza luogo");
  });

  it("works when all sessions have no location", () => {
    const result = groupSessionsByLocation<TestSession>([
      s("a", "10:00", "14:00", undefined),
      s("b", "09:00", "10:00", undefined),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].locationId).toBeNull();
    expect(result[0].locationName).toBe("Senza luogo");
    expect(result[0].sessions.map((x) => x.id)).toEqual(["b", "a"]);
  });
});

describe("sortSessionsLikeProgram", () => {
  it("flattens groups preserving the UI order: per-location time order, groups by earliest start", () => {
    // The exact scenario from the screenshot: insertion order is by time, but
    // exports must order by location group (Palcoscenico first because its
    // earliest session starts at 10:00) and then by time within group.
    const result = sortSessionsLikeProgram<TestSession>([
      s("prova-scena", "10:00", "14:00", PALCO),
      s("prova-tecnica", "15:00", "18:30", PALCO),
      s("trucco", "18:00", "20:30", SALA),
      s("recita", "20:45", "23:59", PALCO),
    ]);
    expect(result.map((x) => x.id)).toEqual([
      "prova-scena",
      "prova-tecnica",
      "recita",
      "trucco",
    ]);
  });

  it("keeps no-location sessions at the end", () => {
    const result = sortSessionsLikeProgram<TestSession>([
      s("nowhere", "08:00", "09:00", undefined),
      s("palco", "10:00", "14:00", PALCO),
    ]);
    expect(result.map((x) => x.id)).toEqual(["palco", "nowhere"]);
  });
});
