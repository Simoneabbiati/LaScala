import type { PresetFigure } from "./activity-presets";

export type ExpansionMember = {
  id: string;
  department: string;
  roleTitle: string;
  characterName: string | null;
};

export type ExpansionDept = { value: string; label: string };

export type PendingNewMember = {
  department: string;
  roleTitle: string;
  personId: null;
  required: boolean;
};

export type ExpandResult = {
  /** Slots to insert into ProductionMember (personId=null). */
  membersToCreate: PendingNewMember[];
  /** Existing member IDs that should get entries. */
  includedMemberIds: string[];
  /** Lookup: memberId -> required flag. */
  requiredById: Record<string, boolean>;
  /** Alias of membersToCreate for the caller's response payload. */
  pendingForNewMembers: PendingNewMember[];
};

export function expandPreset(
  preset: PresetFigure[],
  existingMembers: ExpansionMember[],
  departments: ExpansionDept[],
): ExpandResult {
  const deptLabel = new Map(departments.map((d) => [d.value, d.label] as const));
  const includedIds = new Set<string>();
  const requiredById: Record<string, boolean> = {};
  const toCreate: PendingNewMember[] = [];

  const includeMember = (memberId: string, required: boolean) => {
    includedIds.add(memberId);
    requiredById[memberId] = (requiredById[memberId] ?? false) || required;
  };

  const slotKey = (dept: string, roleTitle: string) => `${dept}::${roleTitle}`;
  const plannedSlots = new Set<string>();
  const recordSlot = (department: string, roleTitle: string, required: boolean) => {
    const key = slotKey(department, roleTitle);
    if (plannedSlots.has(key)) return;
    plannedSlots.add(key);
    toCreate.push({ department, roleTitle, personId: null, required });
  };

  for (const fig of preset) {
    if (fig.kind === "all") {
      for (const m of existingMembers) includeMember(m.id, fig.required);
      continue;
    }
    if (fig.kind === "dept") {
      const matches = existingMembers.filter((m) => m.department === fig.department);
      if (matches.length > 0) {
        for (const m of matches) includeMember(m.id, fig.required);
      } else {
        const label = deptLabel.get(fig.department) ?? fig.department;
        recordSlot(fig.department, label, fig.required);
      }
      continue;
    }
    // kind === "role"
    const match = existingMembers.find(
      (m) => m.department === fig.department && m.roleTitle === fig.roleTitle,
    );
    if (match) {
      includeMember(match.id, fig.required);
    } else {
      recordSlot(fig.department, fig.roleTitle, fig.required);
    }
  }

  return {
    membersToCreate: toCreate,
    includedMemberIds: [...includedIds],
    requiredById,
    pendingForNewMembers: toCreate,
  };
}
