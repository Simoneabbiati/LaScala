import { describe, it, expect } from "vitest";
import { validateSchedaPayload, type SchedaPayload } from "@/lib/scheda";

const validPayload: SchedaPayload = {
  plot: "Una trama qualsiasi.",
  schedaNotes: "Note varie.",
  acts: [{ title: "Atto I", description: "Chiesa" }],
  chorusRoles: [{ name: "Soldati" }],
  interiors: [{ name: "Sagrestia" }],
  hazards: [{ name: "Pistola scenica" }],
};

describe("validateSchedaPayload", () => {
  it("accepts a valid payload", () => {
    const res = validateSchedaPayload(validPayload);
    expect(res.ok).toBe(true);
  });

  it("accepts null plot and notes", () => {
    const res = validateSchedaPayload({ ...validPayload, plot: null, schedaNotes: null });
    expect(res.ok).toBe(true);
  });

  it("accepts empty lists", () => {
    const res = validateSchedaPayload({
      plot: null, schedaNotes: null,
      acts: [], chorusRoles: [], interiors: [], hazards: [],
    });
    expect(res.ok).toBe(true);
  });

  it("rejects plot longer than 10000 chars", () => {
    const res = validateSchedaPayload({ ...validPayload, plot: "a".repeat(10001) });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/plot/i);
  });

  it("rejects act with empty title", () => {
    const res = validateSchedaPayload({
      ...validPayload,
      acts: [{ title: "", description: null }],
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/act/i);
  });

  it("rejects chorus role with name longer than 200 chars", () => {
    const res = validateSchedaPayload({
      ...validPayload,
      chorusRoles: [{ name: "x".repeat(201) }],
    });
    expect(res.ok).toBe(false);
  });

  it("rejects more than 50 items in a list", () => {
    const res = validateSchedaPayload({
      ...validPayload,
      hazards: Array.from({ length: 51 }, (_, i) => ({ name: `h${i}` })),
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/hazard/i);
  });

  it("rejects non-object input", () => {
    expect(validateSchedaPayload(null).ok).toBe(false);
    expect(validateSchedaPayload("x").ok).toBe(false);
    expect(validateSchedaPayload({}).ok).toBe(false);
  });
});
