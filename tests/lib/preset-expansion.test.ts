import { describe, it, expect } from "vitest";
import { expandPreset } from "@/lib/preset-expansion";
import type { PresetFigure } from "@/lib/activity-presets";

type Member = { id: string; department: string; roleTitle: string; characterName: string | null };
type Dept = { value: string; label: string };

const DEPTS: Dept[] = [
  { value: "TEAM_CREATIVO",        label: "Team Creativo" },
  { value: "CAST",                 label: "Solisti" },
  { value: "MAESTRO_DI_SALA",      label: "Maestro di Sala" },
  { value: "MAESTRI_DI_PALCOSCENICO", label: "Maestri di Palcoscenico" },
  { value: "ORCHESTRA",            label: "Orchestra" },
];

describe("expandPreset", () => {
  it("kind:dept includes existing members when present", () => {
    const preset: PresetFigure[] = [
      { kind: "dept", department: "CAST", required: true },
    ];
    const members: Member[] = [
      { id: "m1", department: "CAST", roleTitle: "Soprano", characterName: "Gulliver" },
      { id: "m2", department: "CAST", roleTitle: "Tenore", characterName: "Lemuel" },
      { id: "m3", department: "ORCHESTRA", roleTitle: "Orchestra", characterName: null },
    ];
    const result = expandPreset(preset, members, DEPTS);
    expect(result.membersToCreate).toEqual([]);
    expect(result.includedMemberIds.sort()).toEqual(["m1", "m2"]);
    expect(result.requiredById["m1"]).toBe(true);
  });

  it("kind:dept creates one empty slot when dept is empty in roster", () => {
    const preset: PresetFigure[] = [
      { kind: "dept", department: "MAESTRO_DI_SALA", required: true },
    ];
    const result = expandPreset(preset, [], DEPTS);
    expect(result.membersToCreate).toHaveLength(1);
    expect(result.membersToCreate[0]).toMatchObject({
      department: "MAESTRO_DI_SALA",
      roleTitle: "Maestro di Sala",
      personId: null,
    });
    expect(result.includedMemberIds).toEqual([]);
    expect(result.pendingForNewMembers).toHaveLength(1);
  });

  it("kind:role matches by department AND roleTitle", () => {
    const preset: PresetFigure[] = [
      { kind: "role", department: "TEAM_CREATIVO", roleTitle: "Regista", required: true },
    ];
    const members: Member[] = [
      { id: "m1", department: "TEAM_CREATIVO", roleTitle: "Regista", characterName: null },
      { id: "m2", department: "TEAM_CREATIVO", roleTitle: "Costumista", characterName: null },
    ];
    const result = expandPreset(preset, members, DEPTS);
    expect(result.includedMemberIds).toEqual(["m1"]);
    expect(result.membersToCreate).toEqual([]);
  });

  it("kind:role creates a slot with exact roleTitle when missing", () => {
    const preset: PresetFigure[] = [
      { kind: "role", department: "TEAM_CREATIVO", roleTitle: "Regista", required: true },
    ];
    const members: Member[] = [
      { id: "m1", department: "TEAM_CREATIVO", roleTitle: "Costumista", characterName: null },
    ];
    const result = expandPreset(preset, members, DEPTS);
    expect(result.membersToCreate).toHaveLength(1);
    expect(result.membersToCreate[0]).toMatchObject({
      department: "TEAM_CREATIVO",
      roleTitle: "Regista",
      personId: null,
    });
    expect(result.includedMemberIds).toEqual([]);
  });

  it("kind:all includes every existing member, never creates slots", () => {
    const preset: PresetFigure[] = [{ kind: "all", required: true }];
    const members: Member[] = [
      { id: "m1", department: "TEAM_CREATIVO", roleTitle: "Regista", characterName: null },
      { id: "m2", department: "CAST", roleTitle: "Soprano", characterName: null },
      { id: "m3", department: "ORCHESTRA", roleTitle: "Orchestra", characterName: null },
    ];
    const result = expandPreset(preset, members, DEPTS);
    expect(result.membersToCreate).toEqual([]);
    expect(result.includedMemberIds.sort()).toEqual(["m1", "m2", "m3"]);
  });

  it("kind:all returns empty when roster is empty (no slot creation)", () => {
    const preset: PresetFigure[] = [{ kind: "all", required: true }];
    const result = expandPreset(preset, [], DEPTS);
    expect(result.membersToCreate).toEqual([]);
    expect(result.includedMemberIds).toEqual([]);
  });

  it("dedups across multiple preset figures pointing at same member", () => {
    const preset: PresetFigure[] = [
      { kind: "all", required: true },
      { kind: "dept", department: "CAST", required: true },
      { kind: "role", department: "CAST", roleTitle: "Soprano", required: true },
    ];
    const members: Member[] = [
      { id: "m1", department: "CAST", roleTitle: "Soprano", characterName: null },
    ];
    const result = expandPreset(preset, members, DEPTS);
    expect(result.includedMemberIds).toEqual(["m1"]);
  });

  it("propagates required:false for optional figures", () => {
    const preset: PresetFigure[] = [
      { kind: "dept", department: "ORCHESTRA", required: false },
    ];
    const members: Member[] = [
      { id: "m1", department: "ORCHESTRA", roleTitle: "Orchestra", characterName: null },
    ];
    const result = expandPreset(preset, members, DEPTS);
    expect(result.requiredById["m1"]).toBe(false);
  });

  it("falls back to dept value when label is unknown", () => {
    const preset: PresetFigure[] = [
      { kind: "dept", department: "WEIRD_DEPT", required: true },
    ];
    const result = expandPreset(preset, [], DEPTS);
    expect(result.membersToCreate[0]).toMatchObject({
      department: "WEIRD_DEPT",
      roleTitle: "WEIRD_DEPT",
    });
  });
});
