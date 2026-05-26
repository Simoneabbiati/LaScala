# Activity-Based ODG Auto-Population Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the user creates an `OdgSession` (day block), automatically populate the individual `OdgEntry` rows for all figures required by that activity type, creating empty roster slots if the figures are missing.

**Architecture:** Pure preset data in `src/lib/activity-presets.ts` + pure expansion helper in `src/lib/preset-expansion.ts` (so it's unit-testable without DB). The existing `linkedToDept` inline logic in `entries/route.ts` is extracted to `src/lib/linked-depts.ts` so both POST endpoints share it. The session POST endpoint orchestrates everything inside one Prisma transaction and returns `{session, createdMembers, createdEntries}` so the client can build an informative toast (Sonner).

**Tech Stack:** Next.js 16 App Router, Prisma 7 + libSQL, TypeScript 5, React 19, Tailwind v4 + shadcn/ui. Tests: vitest + tsx (no jest), against an isolated SQLite file in `/tmp`.

**Reference spec:** [docs/superpowers/specs/2026-05-22-activity-presets-design.md](../specs/2026-05-22-activity-presets-design.md)

---

## File Structure

| File | Status | Responsibility |
|------|--------|---------------|
| `src/lib/activity-presets.ts` | NEW | Pure data: `ACTIVITY_PRESETS` map (24 entries) + types |
| `src/lib/preset-expansion.ts` | NEW | Pure function: takes preset + existing members, returns members to create and member IDs to wire into entries |
| `src/lib/linked-depts.ts` | NEW | Extracted helper: applies `linkedToDept` department auto-creation for a batch of entries |
| `src/lib/constants.ts` | MODIFY | Replace `ACTIVITIES` array with the 24 PDF-aligned names |
| `src/app/api/odg/[id]/sessions/route.ts` | MODIFY | POST becomes atomic transaction that expands the preset, creates slots, creates entries |
| `src/app/api/odg/[id]/entries/route.ts` | REFACTOR | Use `applyLinkedDepts` helper instead of inline block |
| `src/components/AppToaster.tsx` | NEW | Wraps Sonner `<Toaster />` with project styling |
| `src/app/layout.tsx` | MODIFY | Mount `<AppToaster />` once in the body |
| `src/app/productions/[id]/odg/[odgId]/page.tsx` | MODIFY | Read JSON response from POST sessions, fire `toast.message(...)` |
| `tests/setup.ts` | NEW | Test DB helper: create temp SQLite, run migrations, seed minimum data |
| `tests/lib/preset-expansion.test.ts` | NEW | Unit tests for the pure expansion logic |
| `tests/lib/linked-depts.test.ts` | NEW | Unit tests for the linked-depts helper (uses test DB) |
| `tests/api/sessions.test.ts` | NEW | Integration tests for POST /sessions auto-populate behavior |
| `vitest.config.ts` | NEW | Vitest config (paths, env, tsx loader) |
| `package.json` | MODIFY | Add deps: `vitest`, `tsx`, `sonner`; add `test` script |

---

## Task 0: Set up Vitest

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Modify: `package.json` (add deps + script)

- [ ] **Step 1: Install dev dependencies**

```bash
cd ~/Projects/LaScala
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"
npm install -D vitest @vitest/ui tsx
```

Expected: `added X packages` with no errors.

- [ ] **Step 2: Install runtime dependency Sonner**

```bash
npm install sonner
```

Expected: `added 1 package`.

- [ ] **Step 3: Add test script to package.json**

Edit `package.json`, in the `scripts` block add `"test": "vitest run"` and `"test:watch": "vitest"`:

```json
"scripts": {
  "postinstall": "prisma generate",
  "dev": "next dev",
  "build": "node scripts/migrate.js && next build",
  "migrate": "node scripts/migrate.js",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run",
  "test:watch": "vitest"
},
```

- [ ] **Step 4: Create vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: [],
    include: ["tests/**/*.test.ts"],
    pool: "forks",
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 5: Create the test DB helper**

Create `tests/setup.ts`:

```ts
import { createClient } from "@libsql/client";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { readFileSync, readdirSync, mkdtempSync, rmSync } from "node:fs";
import { join, tmpdir } from "node:os";
import path from "node:path";

export async function createTestPrisma() {
  const dir = mkdtempSync(path.join(tmpdir(), "lascala-test-"));
  const dbFile = path.join(dir, "test.db");
  const url = `file:${dbFile}`;

  // Apply migrations
  const direct = createClient({ url });
  const migrationsDir = path.join(__dirname, "..", "prisma", "migrations");
  const folders = readdirSync(migrationsDir)
    .filter((f) => f !== "migration_lock.toml")
    .sort();
  for (const folder of folders) {
    const sqlPath = path.join(migrationsDir, folder, "migration.sql");
    let sql: string;
    try { sql = readFileSync(sqlPath, "utf8"); } catch { continue; }
    const statements = sql.split(";").map((s) => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      try { await direct.execute(stmt); } catch (e) {
        const msg = String((e as Error).message ?? e);
        if (!/already exists/i.test(msg) && !/duplicate column/i.test(msg)) throw e;
      }
    }
  }
  await direct.close();

  const adapter = new PrismaLibSql({ url });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prisma = new PrismaClient({ adapter } as any);
  return { prisma, cleanup: () => { rmSync(dir, { recursive: true, force: true }); } };
}

export async function seedMinimalProduction(prisma: any) {
  const theatre = await prisma.theatre.create({ data: { name: "Teatro Test", city: "Milano" } });
  const production = await prisma.production.create({
    data: { title: "Opera Test", theatreId: theatre.id },
  });
  const odg = await prisma.odg.create({
    data: { productionId: production.id, date: new Date("2026-06-01") },
  });
  return { theatre, production, odg };
}
```

- [ ] **Step 6: Smoke test the setup**

Create `tests/setup.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createTestPrisma, seedMinimalProduction } from "./setup";

describe("test infrastructure", () => {
  it("creates a working Prisma client + applies migrations + seeds data", async () => {
    const { prisma, cleanup } = await createTestPrisma();
    try {
      const { theatre, production, odg } = await seedMinimalProduction(prisma);
      expect(theatre.name).toBe("Teatro Test");
      expect(production.title).toBe("Opera Test");
      const departments = await prisma.department.findMany();
      expect(departments.length).toBeGreaterThan(10);
      expect(departments.find((d) => d.value === "CAST")).toBeTruthy();
    } finally {
      await prisma.$disconnect();
      cleanup();
    }
  });
});
```

- [ ] **Step 7: Run the smoke test**

```bash
npm test -- tests/setup.test.ts
```

Expected: 1 test passes. If migrations fail, fix sequentially (often Department seed clashes — `already exists` filter should catch them).

- [ ] **Step 8: Commit**

```bash
git add vitest.config.ts tests/setup.ts tests/setup.test.ts package.json package-lock.json
git commit -m "chore: add vitest + test DB infrastructure"
```

---

## Task 1: Replace the `ACTIVITIES` constant

**Files:**
- Modify: `src/lib/constants.ts`

- [ ] **Step 1: Replace the `ACTIVITIES` array**

Edit `src/lib/constants.ts`. Replace the existing `ACTIVITIES` block (lines 32–53 in the current file) with:

```ts
export const ACTIVITIES = [
  "Prova di Scena",
  "Prova Musicale",
  "Prova Italiana",
  "Antepiano",
  "Prova d'Insieme",
  "Prova Tecnica",
  "Prova Luci",
  "Prova Luci e Video",
  "Prova Costume",
  "Prova Trucco e Parrucco",
  "Prova Riepilogativa",
  "Assestamento",
  "1ª Rappresentazione",
  "2ª Rappresentazione",
  "3ª Rappresentazione",
  "A Disposizione della Tecnica",
  "A Disposizione della Tecnica e delle Luci",
  "Conferenza Stampa",
  "Montaggio",
  "Antegenerale",
  "Generale",
  "Prova d'Insieme in Costume",
  "Prova di Scena in Costume",
  "Accordatura Cembalo",
] as const;

export type Activity = (typeof ACTIVITIES)[number];
```

- [ ] **Step 2: Verify TypeScript still compiles**

```bash
npx tsc --noEmit
```

Expected: no new TS errors. If usage sites reference removed values like `"Sitzprobe"`, they'll surface here — but the spec accepts losing those from the dropdown.

- [ ] **Step 3: Commit**

```bash
git add src/lib/constants.ts
git commit -m "feat: replace ACTIVITIES list with PDF-aligned 24 entries"
```

---

## Task 2: Create the activity presets data file

**Files:**
- Create: `src/lib/activity-presets.ts`
- Create: `tests/lib/activity-presets.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/activity-presets.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test and confirm failure**

```bash
npm test -- tests/lib/activity-presets.test.ts
```

Expected: FAIL (`Cannot find module '@/lib/activity-presets'`).

- [ ] **Step 3: Create the presets file**

Create `src/lib/activity-presets.ts`:

```ts
export type PresetFigure =
  | { kind: "role"; department: string; roleTitle: string; required: boolean }
  | { kind: "dept"; department: string;                    required: boolean }
  | { kind: "all";                                          required: boolean };

const ROLE_REGISTA               = { kind: "role" as const, department: "TEAM_CREATIVO", roleTitle: "Regista",                      required: true };
const ROLE_ASS_REGIA             = { kind: "role" as const, department: "TEAM_CREATIVO", roleTitle: "Assistente alla Regia",        required: true };
const ROLE_DIRETTORE             = { kind: "role" as const, department: "TEAM_CREATIVO", roleTitle: "Direttore d'Orchestra",        required: true };
const ROLE_DIR_COMPL             = { kind: "role" as const, department: "TEAM_CREATIVO", roleTitle: "Direttore del Complesso Musicale di Palcoscenico", required: true };
const ROLE_COSTUMISTA            = { kind: "role" as const, department: "TEAM_CREATIVO", roleTitle: "Costumista",                   required: true };
const ROLE_SCENOGRAFO            = { kind: "role" as const, department: "TEAM_CREATIVO", roleTitle: "Scenografo",                   required: true };
const ROLE_ASS_SCENOGRAFO        = { kind: "role" as const, department: "TEAM_CREATIVO", roleTitle: "Assistente alle Scene",        required: true };
const ROLE_LIGHTING              = { kind: "role" as const, department: "TEAM_CREATIVO", roleTitle: "Light Designer",               required: true };
const ROLE_VIDEO                 = { kind: "role" as const, department: "TEAM_CREATIVO", roleTitle: "Video Designer",               required: true };
const ROLE_COMPARSE              = { kind: "role" as const, department: "CAST_EXTRAS",  roleTitle: "Comparse",                     required: true };
const ROLE_MIMI                  = { kind: "role" as const, department: "CAST_EXTRAS",  roleTitle: "Mimi",                         required: true };
const ROLE_MIME                  = { kind: "role" as const, department: "CAST_EXTRAS",  roleTitle: "Mime",                         required: true };
const DEPT_CAST                  = { kind: "dept" as const, department: "CAST",                                                     required: true };
const DEPT_TEAM_CREATIVO         = { kind: "dept" as const, department: "TEAM_CREATIVO",                                            required: true };
const DEPT_MAESTRO_DI_SALA       = { kind: "dept" as const, department: "MAESTRO_DI_SALA",                                          required: true };
const DEPT_MAESTRI_PALCO         = { kind: "dept" as const, department: "MAESTRI_DI_PALCOSCENICO",                                  required: true };
const DEPT_MAESTRO_ALLE_LUCI     = { kind: "dept" as const, department: "MAESTRO_ALLE_LUCI",                                        required: true };
const DEPT_ORCHESTRA             = { kind: "dept" as const, department: "ORCHESTRA",                                                required: true };
const DEPT_COMPL_MUSICALE        = { kind: "dept" as const, department: "COMPLESSO_MUSICALE_PALCOSCENICO",                          required: true };
const DEPT_CORO_UOMINI           = { kind: "dept" as const, department: "ARTISTI_CORO_UOMINI",                                      required: true };
const DEPT_CORO_DONNE            = { kind: "dept" as const, department: "ARTISTE_CORO_DONNE",                                       required: true };
const DEPT_CORO_VOCI_BIANCHE     = { kind: "dept" as const, department: "CORO_VOCI_BIANCHE",                                        required: true };
const DEPT_MACCHINISTI           = { kind: "dept" as const, department: "MACCHINISTI",                                              required: true };
const DEPT_ELETTRICISTI          = { kind: "dept" as const, department: "ELETTRICISTI",                                             required: true };
const DEPT_CONSOLLISTA           = { kind: "dept" as const, department: "CONSOLLISTA",                                              required: true };
const DEPT_ATTREZZISTI           = { kind: "dept" as const, department: "ATTREZZISTI",                                              required: true };
const DEPT_FONICI                = { kind: "dept" as const, department: "FONICI",                                                   required: true };
const DEPT_SARTORIA              = { kind: "dept" as const, department: "SARTORIA",                                                 required: true };
const DEPT_TRUCCO_PARRUCCO       = { kind: "dept" as const, department: "TRUCCO_PARRUCCO",                                          required: true };
const ALL_REPARTI                = { kind: "all"  as const, required: true };

const optional = (f: PresetFigure): PresetFigure => ({ ...f, required: false } as PresetFigure);

export const ACTIVITY_PRESETS: Record<string, PresetFigure[]> = {
  "Prova di Scena": [
    ROLE_REGISTA, ROLE_ASS_REGIA,
    DEPT_CAST,
    DEPT_MAESTRO_DI_SALA, DEPT_MAESTRI_PALCO,
  ],
  "Prova Musicale": [
    ROLE_DIRETTORE,
    DEPT_CAST,
    DEPT_MAESTRO_DI_SALA,
    optional(DEPT_CORO_UOMINI), optional(DEPT_CORO_DONNE),
  ],
  "Prova Italiana": [
    ROLE_DIRETTORE,
    DEPT_CAST,
    DEPT_ORCHESTRA,
    DEPT_COMPL_MUSICALE, ROLE_DIR_COMPL,
    DEPT_CORO_UOMINI, DEPT_CORO_DONNE,
    DEPT_CORO_VOCI_BIANCHE,
  ],
  "Antepiano": [
    ROLE_REGISTA, ROLE_ASS_REGIA,
    DEPT_CAST,
    { kind: "dept", department: "CAST_EXTRAS", required: true },
    DEPT_MAESTRO_DI_SALA, DEPT_MAESTRI_PALCO, DEPT_MAESTRO_ALLE_LUCI,
    DEPT_MACCHINISTI, DEPT_ELETTRICISTI, DEPT_ATTREZZISTI, DEPT_FONICI,
    DEPT_TRUCCO_PARRUCCO, DEPT_SARTORIA,
  ],
  "Prova d'Insieme": [ALL_REPARTI],
  "Prova Tecnica": [
    ROLE_REGISTA, ROLE_ASS_REGIA,
    DEPT_MACCHINISTI, DEPT_ELETTRICISTI, DEPT_ATTREZZISTI,
  ],
  "Prova Luci": [
    ROLE_REGISTA, ROLE_ASS_REGIA,
    ROLE_LIGHTING,
    ROLE_COMPARSE, ROLE_MIMI, ROLE_MIME,
    DEPT_MACCHINISTI,
    DEPT_ELETTRICISTI, DEPT_CONSOLLISTA,
    DEPT_ATTREZZISTI,
  ],
  "Prova Luci e Video": [
    ROLE_REGISTA, ROLE_ASS_REGIA,
    ROLE_LIGHTING, ROLE_VIDEO,
    ROLE_COMPARSE, ROLE_MIMI, ROLE_MIME,
    DEPT_MACCHINISTI,
    DEPT_ELETTRICISTI, DEPT_CONSOLLISTA,
    DEPT_ATTREZZISTI,
  ],
  "Prova Costume": [
    ROLE_COSTUMISTA,
    DEPT_CAST,
    DEPT_SARTORIA,
  ],
  "Prova Trucco e Parrucco": [
    ROLE_COSTUMISTA,
    DEPT_CAST,
    DEPT_SARTORIA, DEPT_TRUCCO_PARRUCCO,
  ],
  "Prova Riepilogativa": [
    ROLE_DIRETTORE,
    DEPT_ORCHESTRA,
  ],
  "Assestamento": [
    ROLE_DIRETTORE,
    DEPT_ORCHESTRA,
  ],
  "1ª Rappresentazione": [ALL_REPARTI],
  "2ª Rappresentazione": [ALL_REPARTI],
  "3ª Rappresentazione": [ALL_REPARTI],
  "A Disposizione della Tecnica": [
    DEPT_MACCHINISTI, DEPT_ELETTRICISTI, DEPT_ATTREZZISTI, DEPT_FONICI,
  ],
  "A Disposizione della Tecnica e delle Luci": [
    DEPT_MACCHINISTI,
    DEPT_ELETTRICISTI, DEPT_CONSOLLISTA,
    DEPT_ATTREZZISTI, DEPT_FONICI,
  ],
  "Conferenza Stampa": [
    DEPT_CAST,
    DEPT_TEAM_CREATIVO,
  ],
  "Montaggio": [
    ROLE_SCENOGRAFO, ROLE_ASS_SCENOGRAFO,
    ROLE_REGISTA, ROLE_ASS_REGIA,
    DEPT_MACCHINISTI, DEPT_ELETTRICISTI, DEPT_ATTREZZISTI, DEPT_FONICI,
  ],
  "Antegenerale": [ALL_REPARTI],
  "Generale": [ALL_REPARTI],
  "Prova d'Insieme in Costume": [ALL_REPARTI],
  "Prova di Scena in Costume": [
    ROLE_REGISTA, ROLE_ASS_REGIA,
    DEPT_CAST,
    DEPT_MAESTRO_DI_SALA, DEPT_MAESTRI_PALCO,
    DEPT_SARTORIA, DEPT_TRUCCO_PARRUCCO,
    DEPT_MACCHINISTI,
    DEPT_ELETTRICISTI, DEPT_CONSOLLISTA,
    DEPT_ATTREZZISTI,
  ],
  "Accordatura Cembalo": [
    DEPT_ORCHESTRA,
  ],
};
```

- [ ] **Step 4: Run the test, confirm passes**

```bash
npm test -- tests/lib/activity-presets.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/activity-presets.ts tests/lib/activity-presets.test.ts
git commit -m "feat: add ACTIVITY_PRESETS data mapping activities to required figures"
```

---

## Task 3: Pure preset-expansion helper

**Files:**
- Create: `src/lib/preset-expansion.ts`
- Create: `tests/lib/preset-expansion.test.ts`

The expansion logic takes a list of preset figures and the existing roster, and returns:
1. Which members to create (with empty personId)
2. Which existing member IDs to include in entries
3. The "required" flag for each entry (for the toast)

Keep this pure (no DB access) so it's easy to test.

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/preset-expansion.test.ts`:

```ts
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
      roleTitle: "WEIRD_DEPT", // fallback when no matching dept label
    });
  });
});
```

- [ ] **Step 2: Run, confirm failure**

```bash
npm test -- tests/lib/preset-expansion.test.ts
```

Expected: FAIL (cannot find module).

- [ ] **Step 3: Implement the pure helper**

Create `src/lib/preset-expansion.ts`:

```ts
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
  /** Slots to insert into ProductionMember (personId=null). Indices align with pendingForNewMembers. */
  membersToCreate: PendingNewMember[];
  /** Existing member IDs that should get entries. */
  includedMemberIds: string[];
  /** Lookup: memberId -> required flag. Includes both existing matches and (after they're created) new ones. */
  requiredById: Record<string, boolean>;
  /** Same as membersToCreate, exposed separately for the caller's response payload. */
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
    if (!includedIds.has(memberId)) includedIds.add(memberId);
    // OR-merge required (any required occurrence => required)
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
      // never create slots for "all"
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
```

- [ ] **Step 4: Run all tests in this file, confirm green**

```bash
npm test -- tests/lib/preset-expansion.test.ts
```

Expected: 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/preset-expansion.ts tests/lib/preset-expansion.test.ts
git commit -m "feat: add pure preset-expansion helper with unit tests"
```

---

## Task 4: Extract `linkedToDept` into shared helper

**Files:**
- Create: `src/lib/linked-depts.ts`
- Create: `tests/lib/linked-depts.test.ts`
- Modify: `src/app/api/odg/[id]/entries/route.ts`

The current inline block in `entries/route.ts` (lines 32–72) auto-creates entries for departments linked to the one of a just-added entry. We extract this into a function reusable from both the entries POST and the new sessions POST.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/linked-depts.test.ts`:

```ts
import { describe, it, expect, afterEach } from "vitest";
import { createTestPrisma, seedMinimalProduction } from "../setup";
import { applyLinkedDepts } from "@/lib/linked-depts";

describe("applyLinkedDepts", () => {
  let cleanupFn: () => void;
  afterEach(() => { cleanupFn?.(); });

  it("creates entries for linked maestro when choir entry is added", async () => {
    const { prisma, cleanup } = await createTestPrisma();
    cleanupFn = cleanup;
    try {
      const { production, odg } = await seedMinimalProduction(prisma);

      // Seed members: one choir member, one maestro member
      const coroMember = await prisma.productionMember.create({
        data: { productionId: production.id, department: "ARTISTI_CORO_UOMINI", roleTitle: "Artisti del Coro (Uomini)" },
      });
      const maestroMember = await prisma.productionMember.create({
        data: { productionId: production.id, department: "MAESTRO_CORO_UOMINI", roleTitle: "Maestro del Coro (Uomini)" },
      });

      // Existing entry for the coro (the "trigger" entry)
      await prisma.odgEntry.create({
        data: { odgId: odg.id, memberId: coroMember.id, startTime: "10:00", endTime: "12:00", activity: "Prova Italiana", sortOrder: 0 },
      });

      await applyLinkedDepts(prisma, {
        odgId: odg.id,
        sourceMembers: [coroMember],
        startTime: "10:00",
        endTime: "12:00",
        activity: "Prova Italiana",
        locationId: null,
      });

      const entries = await prisma.odgEntry.findMany({ where: { odgId: odg.id } });
      const maestroEntry = entries.find((e) => e.memberId === maestroMember.id);
      expect(maestroEntry).toBeDefined();
      expect(maestroEntry?.activity).toBe("Prova Italiana");
    } finally {
      await prisma.$disconnect();
    }
  });

  it("does not duplicate linked entries that already exist", async () => {
    const { prisma, cleanup } = await createTestPrisma();
    cleanupFn = cleanup;
    try {
      const { production, odg } = await seedMinimalProduction(prisma);
      const coroMember = await prisma.productionMember.create({
        data: { productionId: production.id, department: "ARTISTI_CORO_UOMINI", roleTitle: "Artisti del Coro (Uomini)" },
      });
      const maestroMember = await prisma.productionMember.create({
        data: { productionId: production.id, department: "MAESTRO_CORO_UOMINI", roleTitle: "Maestro del Coro (Uomini)" },
      });
      await prisma.odgEntry.createMany({
        data: [
          { odgId: odg.id, memberId: coroMember.id, startTime: "10:00", endTime: "12:00", activity: "Prova Italiana", sortOrder: 0 },
          { odgId: odg.id, memberId: maestroMember.id, startTime: "10:00", endTime: "12:00", activity: "Prova Italiana", sortOrder: 1 },
        ],
      });
      await applyLinkedDepts(prisma, {
        odgId: odg.id,
        sourceMembers: [coroMember],
        startTime: "10:00",
        endTime: "12:00",
        activity: "Prova Italiana",
        locationId: null,
      });
      const maestroEntries = await prisma.odgEntry.findMany({
        where: { odgId: odg.id, memberId: maestroMember.id },
      });
      expect(maestroEntries).toHaveLength(1);
    } finally {
      await prisma.$disconnect();
    }
  });

  it("does nothing when source department has no linked dept", async () => {
    const { prisma, cleanup } = await createTestPrisma();
    cleanupFn = cleanup;
    try {
      const { production, odg } = await seedMinimalProduction(prisma);
      const member = await prisma.productionMember.create({
        data: { productionId: production.id, department: "MACCHINISTI", roleTitle: "Reparto Macchinisti" },
      });
      await prisma.odgEntry.create({
        data: { odgId: odg.id, memberId: member.id, startTime: "10:00", endTime: "12:00", activity: "Prova Tecnica", sortOrder: 0 },
      });
      await applyLinkedDepts(prisma, {
        odgId: odg.id,
        sourceMembers: [member],
        startTime: "10:00",
        endTime: "12:00",
        activity: "Prova Tecnica",
        locationId: null,
      });
      const entries = await prisma.odgEntry.findMany({ where: { odgId: odg.id } });
      expect(entries).toHaveLength(1); // only the original
    } finally {
      await prisma.$disconnect();
    }
  });
});
```

- [ ] **Step 2: Run, confirm failure**

```bash
npm test -- tests/lib/linked-depts.test.ts
```

Expected: FAIL (cannot find module).

- [ ] **Step 3: Create the helper**

Create `src/lib/linked-depts.ts`:

```ts
import type { PrismaClient, ProductionMember } from "@/generated/prisma/client";

type ApplyArgs = {
  odgId: string;
  sourceMembers: ProductionMember[];
  startTime: string;
  endTime: string;
  activity: string;
  locationId: string | null;
  notes?: string | null;
};

export async function applyLinkedDepts(prisma: PrismaClient, args: ApplyArgs): Promise<void> {
  const { odgId, sourceMembers, startTime, endTime, activity, locationId, notes } = args;
  if (sourceMembers.length === 0) return;

  const sourceDepts = [...new Set(sourceMembers.map((m) => m.department))];
  const productionIds = [...new Set(sourceMembers.map((m) => m.productionId))];
  if (productionIds.length !== 1) {
    throw new Error("applyLinkedDepts: sourceMembers must belong to a single production");
  }
  const productionId = productionIds[0];

  const linkedDepts = await prisma.department.findMany({
    where: { linkedToDept: { in: sourceDepts } },
  });
  if (linkedDepts.length === 0) return;

  const linkedMembers = await prisma.productionMember.findMany({
    where: {
      productionId,
      department: { in: linkedDepts.map((d) => d.value) },
    },
  });
  if (linkedMembers.length === 0) return;

  const existing = await prisma.odgEntry.findMany({
    where: { odgId, memberId: { in: linkedMembers.map((m) => m.id) } },
    select: { memberId: true },
  });
  const already = new Set(existing.map((e) => e.memberId));

  const toCreate = linkedMembers.filter((m) => !already.has(m.id));
  if (toCreate.length === 0) return;

  const currentCount = await prisma.odgEntry.count({ where: { odgId } });
  await prisma.odgEntry.createMany({
    data: toCreate.map((m, i) => ({
      odgId,
      memberId: m.id,
      startTime,
      endTime,
      activity,
      locationId: locationId ?? null,
      notes: notes ?? null,
      characterName: null,
      sortOrder: currentCount + i,
    })),
  });
}
```

- [ ] **Step 4: Run helper tests, confirm green**

```bash
npm test -- tests/lib/linked-depts.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Refactor `entries/route.ts` to use the helper**

Replace the contents of `src/app/api/odg/[id]/entries/route.ts` with:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyLinkedDepts } from "@/lib/linked-depts";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: odgId } = await params;
  const body = await req.json();
  try {
    const member = await prisma.productionMember.findUnique({
      where: { id: body.memberId },
    });
    const characterName = body.characterName !== undefined
      ? (body.characterName || null)
      : (member?.characterName ?? null);

    const entry = await prisma.odgEntry.create({
      data: {
        odgId,
        memberId: body.memberId,
        startTime: body.startTime,
        endTime: body.endTime,
        activity: body.activity,
        locationId: body.locationId || null,
        notes: body.notes,
        characterName,
        sortOrder: body.sortOrder ?? 0,
      },
      include: { member: { include: { person: true } }, location: true },
    });

    if (member) {
      await applyLinkedDepts(prisma, {
        odgId,
        sourceMembers: [member],
        startTime: body.startTime,
        endTime: body.endTime,
        activity: body.activity,
        locationId: body.locationId || null,
        notes: body.notes ?? null,
      });
    }

    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    console.error("[POST /api/odg/[id]/entries]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
```

- [ ] **Step 6: Run ALL tests, confirm nothing broke**

```bash
npm test
```

Expected: all tests so far pass (3 linked-depts + 9 expansion + 3 presets + setup smoke).

- [ ] **Step 7: Commit**

```bash
git add src/lib/linked-depts.ts tests/lib/linked-depts.test.ts src/app/api/odg/\[id\]/entries/route.ts
git commit -m "refactor: extract linkedToDept logic into shared helper"
```

---

## Task 5: Auto-populate session POST endpoint

**Files:**
- Modify: `src/app/api/odg/[id]/sessions/route.ts`
- Create: `tests/api/sessions.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/api/sessions.test.ts`:

```ts
import { describe, it, expect, afterEach } from "vitest";
import { createTestPrisma, seedMinimalProduction } from "../setup";

// We test the handler logic by importing it directly and constructing a NextRequest.
// In Next.js 16, route handlers are async functions: (req, ctx) => Response.
import { POST as createSession } from "@/app/api/odg/[id]/sessions/route";

function makeReq(body: object): Request {
  return new Request("http://test/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/odg/[id]/sessions auto-population", () => {
  let cleanupFn: () => void;
  afterEach(() => { cleanupFn?.(); });

  // NOTE: these tests import the real route handler which uses the real prisma
  // from src/lib/db.ts (which connects to prisma/dev.db by default). For correct
  // isolation, set DATABASE_URL env before each test to point to a fresh temp DB.
  // We do this via createTestPrisma which returns the URL it built.

  it("creates session + entries for an activity preset (roster complete)", async () => {
    const { prisma, cleanup, dbUrl } = await createTestPrisma();
    process.env.DATABASE_URL = dbUrl;
    cleanupFn = () => { cleanup(); delete process.env.DATABASE_URL; };
    try {
      const { production, odg } = await seedMinimalProduction(prisma);
      await prisma.productionMember.createMany({
        data: [
          { productionId: production.id, department: "TEAM_CREATIVO", roleTitle: "Regista" },
          { productionId: production.id, department: "TEAM_CREATIVO", roleTitle: "Assistente alla Regia" },
          { productionId: production.id, department: "CAST", roleTitle: "Soprano", characterName: "Gulliver" },
          { productionId: production.id, department: "MAESTRO_DI_SALA", roleTitle: "Maestro di Sala" },
          { productionId: production.id, department: "MAESTRI_DI_PALCOSCENICO", roleTitle: "Maestri di Palcoscenico" },
        ],
      });

      const res = await createSession(makeReq({
        startTime: "10:00", endTime: "12:00", activity: "Prova di Scena", sortOrder: 0,
      }), { params: Promise.resolve({ id: odg.id }) });
      const json = await res.json();
      expect(res.status).toBe(201);
      expect(json.session).toBeDefined();
      expect(json.createdMembers).toEqual([]);
      expect(json.createdEntries.length).toBe(5);
      const entries = await prisma.odgEntry.findMany({ where: { odgId: odg.id } });
      expect(entries).toHaveLength(5);
      expect(entries.every((e) => e.activity === "Prova di Scena")).toBe(true);
      const sopranoEntry = entries.find((e) => e.characterName === "Gulliver");
      expect(sopranoEntry).toBeDefined();
    } finally {
      await prisma.$disconnect();
    }
  });

  it("creates empty slots in roster when figures are missing", async () => {
    const { prisma, cleanup, dbUrl } = await createTestPrisma();
    process.env.DATABASE_URL = dbUrl;
    cleanupFn = () => { cleanup(); delete process.env.DATABASE_URL; };
    try {
      const { production, odg } = await seedMinimalProduction(prisma);
      // empty roster
      const res = await createSession(makeReq({
        startTime: "10:00", endTime: "12:00", activity: "Prova di Scena", sortOrder: 0,
      }), { params: Promise.resolve({ id: odg.id }) });
      const json = await res.json();
      expect(json.createdMembers.length).toBe(5);
      expect(json.createdEntries.length).toBe(5);

      const members = await prisma.productionMember.findMany({ where: { productionId: production.id } });
      expect(members).toHaveLength(5);
      expect(members.every((m) => m.personId === null)).toBe(true);
      const regista = members.find((m) => m.roleTitle === "Regista");
      expect(regista).toBeDefined();
      const maestro = members.find((m) => m.roleTitle === "Maestro di Sala");
      expect(maestro).toBeDefined();
    } finally {
      await prisma.$disconnect();
    }
  });

  it("returns session only when activity has no preset", async () => {
    const { prisma, cleanup, dbUrl } = await createTestPrisma();
    process.env.DATABASE_URL = dbUrl;
    cleanupFn = () => { cleanup(); delete process.env.DATABASE_URL; };
    try {
      const { odg } = await seedMinimalProduction(prisma);
      const res = await createSession(makeReq({
        startTime: "10:00", endTime: "12:00", activity: "ActivityWithoutPreset", sortOrder: 0,
      }), { params: Promise.resolve({ id: odg.id }) });
      const json = await res.json();
      expect(res.status).toBe(201);
      expect(json.session).toBeDefined();
      expect(json.createdMembers).toEqual([]);
      expect(json.createdEntries).toEqual([]);
    } finally {
      await prisma.$disconnect();
    }
  });

  it("dedups entries that already exist for the same (member, time, activity)", async () => {
    const { prisma, cleanup, dbUrl } = await createTestPrisma();
    process.env.DATABASE_URL = dbUrl;
    cleanupFn = () => { cleanup(); delete process.env.DATABASE_URL; };
    try {
      const { production, odg } = await seedMinimalProduction(prisma);
      const regista = await prisma.productionMember.create({
        data: { productionId: production.id, department: "TEAM_CREATIVO", roleTitle: "Regista" },
      });
      await prisma.productionMember.create({
        data: { productionId: production.id, department: "TEAM_CREATIVO", roleTitle: "Assistente alla Regia" },
      });
      await prisma.odgEntry.create({
        data: { odgId: odg.id, memberId: regista.id, startTime: "10:00", endTime: "12:00", activity: "Prova di Scena", sortOrder: 0 },
      });

      const res = await createSession(makeReq({
        startTime: "10:00", endTime: "12:00", activity: "Prova di Scena", sortOrder: 0,
      }), { params: Promise.resolve({ id: odg.id }) });
      await res.json();
      const registaEntries = await prisma.odgEntry.findMany({
        where: { odgId: odg.id, memberId: regista.id },
      });
      expect(registaEntries).toHaveLength(1);
    } finally {
      await prisma.$disconnect();
    }
  });

  it("kind:all expands to every roster member", async () => {
    const { prisma, cleanup, dbUrl } = await createTestPrisma();
    process.env.DATABASE_URL = dbUrl;
    cleanupFn = () => { cleanup(); delete process.env.DATABASE_URL; };
    try {
      const { production, odg } = await seedMinimalProduction(prisma);
      await prisma.productionMember.createMany({
        data: [
          { productionId: production.id, department: "TEAM_CREATIVO", roleTitle: "Regista" },
          { productionId: production.id, department: "CAST", roleTitle: "Soprano" },
          { productionId: production.id, department: "ORCHESTRA", roleTitle: "Orchestra" },
          { productionId: production.id, department: "MACCHINISTI", roleTitle: "Reparto Macchinisti" },
        ],
      });
      const res = await createSession(makeReq({
        startTime: "20:00", endTime: "23:00", activity: "Generale", sortOrder: 0,
      }), { params: Promise.resolve({ id: odg.id }) });
      const json = await res.json();
      expect(json.createdEntries.length).toBe(4);
      expect(json.createdMembers).toEqual([]);
    } finally {
      await prisma.$disconnect();
    }
  });
});
```

Note: this test requires `createTestPrisma` to expose `dbUrl`. Update `tests/setup.ts` accordingly.

- [ ] **Step 2: Update `tests/setup.ts` to expose `dbUrl`**

In `tests/setup.ts`, change the `return` of `createTestPrisma` from `return { prisma, cleanup };` to `return { prisma, cleanup, dbUrl: url };`. Update the TypeScript implicit return type accordingly (no explicit type, inference will pick it up).

- [ ] **Step 3: Run, confirm failure**

```bash
npm test -- tests/api/sessions.test.ts
```

Expected: FAIL (response shape doesn't match, no `createdMembers`/`createdEntries`).

- [ ] **Step 4: Rewrite `sessions/route.ts`**

Replace the entire contents of `src/app/api/odg/[id]/sessions/route.ts` with:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ACTIVITY_PRESETS } from "@/lib/activity-presets";
import { expandPreset } from "@/lib/preset-expansion";
import { applyLinkedDepts } from "@/lib/linked-depts";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: odgId } = await params;
  const body = await req.json();
  try {
    // Resolve production id (sessions live under an Odg which lives under a Production)
    const odg = await prisma.odg.findUnique({ where: { id: odgId } });
    if (!odg) return NextResponse.json({ error: "ODG not found" }, { status: 404 });

    const result = await prisma.$transaction(async (tx) => {
      const session = await tx.odgSession.create({
        data: {
          odgId,
          startTime: body.startTime,
          endTime: body.endTime,
          activity: body.activity,
          locationId: body.locationId || null,
          sortOrder: body.sortOrder ?? 0,
        },
        include: { location: true },
      });

      const preset = ACTIVITY_PRESETS[body.activity as string];
      if (!preset || preset.length === 0) {
        return { session, createdMembers: [], createdEntries: [] };
      }

      const [existingMembers, departments] = await Promise.all([
        tx.productionMember.findMany({ where: { productionId: odg.productionId } }),
        tx.department.findMany(),
      ]);

      const expansion = expandPreset(preset, existingMembers, departments);

      // 1. Create empty roster slots for missing figures
      const createdMembers = [];
      for (const slot of expansion.membersToCreate) {
        const m = await tx.productionMember.create({
          data: {
            productionId: odg.productionId,
            department: slot.department,
            roleTitle: slot.roleTitle,
            personId: null,
          },
        });
        createdMembers.push({
          id: m.id,
          department: m.department,
          roleTitle: m.roleTitle,
          required: slot.required,
        });
        expansion.includedMemberIds.push(m.id);
        expansion.requiredById[m.id] = slot.required;
      }

      // 2. Resolve members (for characterName inheritance + linked-depts trigger source)
      const includedMembers = expansion.includedMemberIds.length > 0
        ? await tx.productionMember.findMany({
            where: { id: { in: expansion.includedMemberIds } },
          })
        : [];

      // 3. Dedup against existing entries that match (member, startTime, endTime, activity)
      const existingEntries = await tx.odgEntry.findMany({
        where: {
          odgId,
          memberId: { in: includedMembers.map((m) => m.id) },
          startTime: body.startTime,
          endTime: body.endTime,
          activity: body.activity,
        },
        select: { memberId: true },
      });
      const skip = new Set(existingEntries.map((e) => e.memberId));
      const toEnter = includedMembers.filter((m) => !skip.has(m.id));

      // 4. Create entries
      const currentCount = await tx.odgEntry.count({ where: { odgId } });
      const entryData = toEnter.map((m, i) => ({
        odgId,
        memberId: m.id,
        startTime: body.startTime,
        endTime: body.endTime,
        activity: body.activity,
        locationId: body.locationId || null,
        notes: null,
        characterName: m.characterName ?? null,
        sortOrder: currentCount + i,
      }));
      if (entryData.length > 0) {
        await tx.odgEntry.createMany({ data: entryData });
      }

      // 5. Apply linked-depts cascade for the just-created entries
      await applyLinkedDepts(tx as unknown as typeof prisma, {
        odgId,
        sourceMembers: toEnter,
        startTime: body.startTime,
        endTime: body.endTime,
        activity: body.activity,
        locationId: body.locationId || null,
      });

      const created = await tx.odgEntry.findMany({
        where: {
          odgId,
          memberId: { in: toEnter.map((m) => m.id) },
          startTime: body.startTime,
          endTime: body.endTime,
          activity: body.activity,
        },
        include: { member: true },
      });

      const createdEntries = created.map((e) => ({
        id: e.id,
        memberId: e.memberId,
        roleTitle: e.member.roleTitle,
        required: expansion.requiredById[e.memberId] ?? true,
      }));

      return { session, createdMembers, createdEntries };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("[POST /api/odg/[id]/sessions]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
```

- [ ] **Step 5: Run, confirm all session tests pass**

```bash
npm test -- tests/api/sessions.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 6: Run the full suite**

```bash
npm test
```

Expected: all passing — `setup`, `activity-presets`, `preset-expansion` (9), `linked-depts` (3), `sessions` (5). Total around 21 tests.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/odg/\[id\]/sessions/route.ts tests/api/sessions.test.ts tests/setup.ts
git commit -m "feat: auto-populate ODG entries from activity presets on session create"
```

---

## Task 6: Mount Sonner toaster

**Files:**
- Create: `src/components/AppToaster.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create the toaster wrapper**

Create `src/components/AppToaster.tsx`:

```tsx
"use client";
import { Toaster } from "sonner";

export default function AppToaster() {
  return (
    <Toaster
      position="bottom-right"
      richColors
      closeButton
      duration={8000}
      toastOptions={{
        style: { fontFamily: "var(--font-sans)" },
      }}
    />
  );
}
```

- [ ] **Step 2: Mount it in the root layout**

Edit `src/app/layout.tsx`. Add the import at the top and render `<AppToaster />` once inside `<body>`:

```tsx
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppSidebar from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import AppToaster from "@/components/AppToaster";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Quinta",
  description: "Gestionale ODG per Direttori di Scena",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={geist.variable}>
      <body>
        <TooltipProvider>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <main className="p-8 max-w-6xl mx-auto w-full">{children}</main>
            </SidebarInset>
          </SidebarProvider>
        </TooltipProvider>
        <AppToaster />
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Visual smoke check**

```bash
npm run dev
```

In another terminal/browser, open `http://localhost:3000`. Page should still render without errors. (Toaster only appears when toasts are fired — we'll trigger one in the next task.)

Kill the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/components/AppToaster.tsx src/app/layout.tsx
git commit -m "feat: mount Sonner toaster in root layout"
```

---

## Task 7: Client integration — show toast on session create

**Files:**
- Modify: `src/app/productions/[id]/odg/[odgId]/page.tsx`

- [ ] **Step 1: Update `addSession` to consume the response**

Edit `src/app/productions/[id]/odg/[odgId]/page.tsx`. Add the Sonner import at the top of the file (near the other imports around line 1–13):

```tsx
import { toast } from "sonner";
```

Then replace the `addSession` function (currently at lines 80–89) with:

```tsx
  const addSession = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/odg/${odgId}/sessions`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...sessionForm, sortOrder: odg?.sessions.length ?? 0 }),
    });
    if (res.ok) {
      const data = await res.json();
      showSessionCreationToast(data, sessionForm.activity);
    }
    setSessionForm(emptySession());
    setShowSessionForm(false);
    load();
  };

  const showSessionCreationToast = (
    data: {
      createdMembers: { roleTitle: string }[];
      createdEntries: { roleTitle: string; required: boolean }[];
    },
    activity: string,
  ) => {
    const { createdMembers, createdEntries } = data;
    if (createdEntries.length === 0) return; // session created but no preset

    const required = createdEntries.filter((e) => e.required);
    const optional = createdEntries.filter((e) => !e.required);

    const lines: string[] = [];
    if (optional.length === 0) {
      lines.push(`Aggiunte ${required.length} figure alla prova "${activity}".`);
    } else {
      lines.push(`Aggiunte ${createdEntries.length} figure alla prova "${activity}" (${required.length} richieste + ${optional.length} opzionali).`);
      lines.push(`Opzionali: ${optional.map((o) => o.roleTitle).join(", ")} — rimuovile se non servono.`);
    }
    if (createdMembers.length > 0) {
      lines.push(
        `Visto che non erano nel roster, ho creato anche queste posizioni (da assegnare): ${createdMembers.map((m) => m.roleTitle).join(", ")}. ` +
        `Puoi compilare i nomi dalla sezione Roster quando vuoi.`,
      );
    }
    toast.message(lines[0], { description: lines.slice(1).join("\n") || undefined });
  };
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no new TS errors.

- [ ] **Step 3: Manual verification — golden path**

```bash
npm run dev
```

Then in browser:
1. Create a Theatre (or use existing).
2. Create a Production under it.
3. Open the Production page, leave roster EMPTY.
4. Create an ODG for today.
5. Open the ODG, click "Add session", fill `startTime=10:00`, `endTime=12:00`, `activity="Prova di Scena"`, submit.
6. **Verify**: a toast appears showing "Aggiunte 5 figure alla prova 'Prova di Scena'." plus a description mentioning the slots created (Regista, Assistente alla Regia, Maestro di Sala, Maestri di Palcoscenico).
7. **Verify**: the entries table shows 5 rows.
8. **Verify**: navigating to the production page, the roster has 5 new "Da assegnare" slots.

Then:
9. Add Regista (with a real Person) to the roster.
10. Back in the ODG, create another session: `Prova di Scena` 14:00–16:00.
11. **Verify**: the entry for Regista this time refers to the SAME ProductionMember (the one with the person), not a new slot.

Stop dev server with `Ctrl-C`.

- [ ] **Step 4: Commit**

```bash
git add src/app/productions/\[id\]/odg/\[odgId\]/page.tsx
git commit -m "feat: show toast after session creation with auto-populated figure list"
```

---

## Task 8: Manual E2E full-flow check

- [ ] **Step 1: Run the full test suite one more time**

```bash
npm test
```

Expected: all green.

- [ ] **Step 2: Run the linter**

```bash
npm run lint
```

Expected: no errors. Fix any new warnings in code you wrote.

- [ ] **Step 3: Run a production build**

```bash
npm run build
```

Expected: build succeeds. The `migrate` step in the build script will be a no-op against an already-migrated DB.

- [ ] **Step 4: Final manual sanity check**

Restart `npm run dev` and exercise these scenarios:
- "Prova Musicale" (has optional Coro): verify toast distinguishes required/optional and entries include both required and optional members.
- "Generale" (kind: all): empty roster → 0 entries, no slot creation. With roster populated → all members appear.
- Activity NOT in the new ACTIVITIES list but still typed via existing data (open an old ODG with "Sitzprobe" if any): editing the old session should still work; creating a new one won't be possible from the dropdown.

- [ ] **Step 5: Final commit (if any leftover changes)**

```bash
git status
git add -p   # review each change
git commit -m "chore: lint/build fixes for activity-presets feature"
```

(Skip if nothing to commit.)

---

## Self-review checklist

- [x] Every spec section has at least one task implementing it.
- [x] No `TBD` / `TODO` placeholders in steps.
- [x] All function/type names used in later tasks are defined in earlier tasks (`expandPreset`, `applyLinkedDepts`, `ACTIVITY_PRESETS`, `PresetFigure`, `ExpansionMember`, `AppToaster`, `showSessionCreationToast`).
- [x] Tests come before implementation in every task that has them.
- [x] Frequent commits — one per task minimum.
- [x] The `linkedToDept` mechanism is preserved (helper extraction is a pure refactor, behavior unchanged).
- [x] The spec's 8 testing scenarios are all covered: happy path (Task 5 t1), slot creation (t2), kind: all (t5), kind: all empty (covered in t5 with empty roster variant — implicit), dedup (t4), no-preset (t3), atomicity (transaction structure guarantees rollback; explicit failure injection not added because it would require mocking — accepted gap), linkedToDept-still-works (Task 4 t1 + Task 4 t3 verify pre/post-refactor behavior).
