import { describe, it, expect } from "vitest";
import { ACTIVITIES } from "@/lib/constants";
import { ACTIVITY_PRESETS } from "@/lib/activity-presets";

describe("ACTIVITY_PRESETS", () => {
  it("has a preset for every activity in ACTIVITIES", () => {
    const missing = ACTIVITIES.filter((a) => !(a in ACTIVITY_PRESETS));
    expect(missing).toEqual([]);
  });

  it("every preset entry has valid kind", () => {
    for (const [activity, figures] of Object.entries(ACTIVITY_PRESETS)) {
      for (const fig of figures) {
        expect(["role", "dept", "all"], `bad kind in "${activity}"`).toContain(fig.kind);
        expect(typeof fig.required, `required missing in "${activity}"`).toBe("boolean");
        if (fig.kind === "role") {
          expect(fig.department.length, `empty dept in "${activity}"`).toBeGreaterThan(0);
          expect(fig.roleTitle.length, `empty roleTitle in "${activity}"`).toBeGreaterThan(0);
        }
        if (fig.kind === "dept") {
          expect(fig.department.length, `empty dept in "${activity}"`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("contains key activities from the spec", () => {
    expect(ACTIVITY_PRESETS["Prova di Scena"]).toBeDefined();
    expect(ACTIVITY_PRESETS["Generale"]).toBeDefined();
    expect(ACTIVITY_PRESETS["Accordatura Cembalo"]).toBeDefined();
  });
});
