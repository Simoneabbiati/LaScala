export type ActInput = { title: string; description: string | null };
export type ListItemInput = { name: string };

export type SchedaPayload = {
  plot: string | null;
  schedaNotes: string | null;
  acts: ActInput[];
  chorusRoles: ListItemInput[];
  interiors: ListItemInput[];
  hazards: ListItemInput[];
};

export type ValidationResult =
  | { ok: true; value: SchedaPayload }
  | { ok: false; error: string };

const MAX_TEXT = 10_000;
const MAX_LIST = 50;
const MAX_NAME = 200;
const MAX_DESC = 1_000;

function isString(x: unknown): x is string {
  return typeof x === "string";
}
function isNullOrString(x: unknown): x is string | null {
  return x === null || typeof x === "string";
}

function validateList(
  raw: unknown,
  listName: string,
  itemValidator: (item: unknown, idx: number) => string | null,
): string | null {
  if (!Array.isArray(raw)) return `${listName} must be an array`;
  if (raw.length > MAX_LIST) return `${listName} must have at most ${MAX_LIST} items`;
  for (let i = 0; i < raw.length; i++) {
    const err = itemValidator(raw[i], i);
    if (err) return `${listName}[${i}]: ${err}`;
  }
  return null;
}

function validateActItem(item: unknown): string | null {
  if (typeof item !== "object" || item === null) return "must be an object";
  const r = item as Record<string, unknown>;
  if (!isString(r.title)) return "title must be a string";
  const trimmedTitle = r.title.trim();
  if (trimmedTitle.length < 1 || trimmedTitle.length > MAX_NAME) return `title must be 1-${MAX_NAME} chars`;
  if (!isNullOrString(r.description)) return "description must be string or null";
  if (typeof r.description === "string" && r.description.length > MAX_DESC) {
    return `description must be at most ${MAX_DESC} chars`;
  }
  return null;
}

function validateNameItem(item: unknown): string | null {
  if (typeof item !== "object" || item === null) return "must be an object";
  const r = item as Record<string, unknown>;
  if (!isString(r.name)) return "name must be a string";
  const trimmedName = r.name.trim();
  if (trimmedName.length < 1 || trimmedName.length > MAX_NAME) return `name must be 1-${MAX_NAME} chars`;
  return null;
}

export function validateSchedaPayload(raw: unknown): ValidationResult {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "payload must be an object" };
  }
  const r = raw as Record<string, unknown>;

  if (!isNullOrString(r.plot)) return { ok: false, error: "plot must be string or null" };
  if (typeof r.plot === "string" && r.plot.length > MAX_TEXT) {
    return { ok: false, error: `plot must be at most ${MAX_TEXT} chars` };
  }
  if (!isNullOrString(r.schedaNotes)) return { ok: false, error: "schedaNotes must be string or null" };
  if (typeof r.schedaNotes === "string" && r.schedaNotes.length > MAX_TEXT) {
    return { ok: false, error: `schedaNotes must be at most ${MAX_TEXT} chars` };
  }

  const actsErr = validateList(r.acts, "acts", validateActItem);
  if (actsErr) return { ok: false, error: actsErr };
  const chorusErr = validateList(r.chorusRoles, "chorusRoles", validateNameItem);
  if (chorusErr) return { ok: false, error: chorusErr };
  const interiorsErr = validateList(r.interiors, "interiors", validateNameItem);
  if (interiorsErr) return { ok: false, error: interiorsErr };
  const hazardsErr = validateList(r.hazards, "hazards", validateNameItem);
  if (hazardsErr) return { ok: false, error: hazardsErr };

  return {
    ok: true,
    value: {
      plot: r.plot as string | null,
      schedaNotes: r.schedaNotes as string | null,
      acts: (r.acts as ActInput[]).map((a) => ({ title: a.title, description: a.description ?? null })),
      chorusRoles: (r.chorusRoles as ListItemInput[]).map((x) => ({ name: x.name })),
      interiors: (r.interiors as ListItemInput[]).map((x) => ({ name: x.name })),
      hazards: (r.hazards as ListItemInput[]).map((x) => ({ name: x.name })),
    },
  };
}
