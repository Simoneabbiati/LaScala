# Production Scheda Opera Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Per ogni `Production` aggiungere una "scheda opera" editoriale (trama, divisione in atti, ruoli del coro, interni, hazards, note) accessibile da una pagina dedicata `/productions/[id]/scheda`. I dati anagrafici dell'opera (titolo, compositore, personaggi cast) sono mostrati in sola lettura.

**Architecture:** Quattro nuove tabelle relazionali 1:N (`ProductionAct`, `ProductionChorusRole`, `ProductionInterior`, `ProductionHazard`) + due colonne testuali su `Production` (`plot`, `schedaNotes`). API unica `/api/productions/[id]/scheda` con `GET` e `PUT` (replace-all in una transazione). UI: server component che fetcha i dati iniziali + client component `SchedaForm` con stato locale e submit unico. Componente riutilizzabile `<StringListEditor>` per le tre liste identiche.

**Tech Stack:** Next.js 16 App Router, Prisma 7 + libSQL, TypeScript 5, React 19, Tailwind v4 + shadcn/ui, Sonner per i toast. Tests: vitest contro SQLite isolato in `/tmp` (no React Testing Library — verifica UI manuale).

**Reference spec:** [../specs/2026-05-26-production-scheda-design.md](../specs/2026-05-26-production-scheda-design.md)

---

## File Structure

| File | Status | Responsibility |
|------|--------|---------------|
| `prisma/schema.prisma` | MODIFY | Aggiungere `plot`, `schedaNotes` su `Production` + 4 nuovi modelli figli |
| `prisma/migrations/<ts>_add_production_scheda/migration.sql` | NEW | SQL: ALTER TABLE Production + 4 CREATE TABLE + indici |
| `src/lib/scheda.ts` | NEW | Tipi TypeScript + validatore puro `validateSchedaPayload` (no zod, validazione manuale per coerenza col progetto) |
| `src/app/api/productions/[id]/scheda/route.ts` | NEW | `GET` (legge scheda) e `PUT` (replace-all in transazione) |
| `src/components/ui/textarea.tsx` | NEW | Componente shadcn `<Textarea>` (non presente nel progetto) |
| `src/components/StringListEditor.tsx` | NEW | Editor riutilizzabile per liste di stringhe con reorder/aggiungi/rimuovi |
| `src/app/productions/[id]/scheda/page.tsx` | NEW | Server component: fetch + render del form |
| `src/app/productions/[id]/scheda/SchedaForm.tsx` | NEW | Client component con stato locale del form e submit |
| `src/app/productions/[id]/page.tsx` | MODIFY | Aggiungere link "Scheda opera" |
| `tests/lib/scheda.test.ts` | NEW | Unit test del validatore |
| `tests/api/productions-scheda.test.ts` | NEW | Integration test per GET/PUT |

---

## Task 1: Schema Prisma + migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260526200000_add_production_scheda/migration.sql`

- [ ] **Step 1: Aggiungere campi e relazioni a `Production` in `prisma/schema.prisma`**

Trova il blocco `model Production { ... }` (intorno alla riga 25). Subito prima della parentesi `}` finale, aggiungi:

```prisma
  plot          String?
  schedaNotes   String?
  acts          ProductionAct[]
  chorusRoles   ProductionChorusRole[]
  interiors     ProductionInterior[]
  hazards       ProductionHazard[]
```

- [ ] **Step 2: Aggiungere i 4 nuovi modelli in fondo a `prisma/schema.prisma`**

Aggiungi alla fine del file:

```prisma
model ProductionAct {
  id           String     @id @default(cuid())
  productionId String
  production   Production @relation(fields: [productionId], references: [id], onDelete: Cascade)
  title        String
  description  String?
  sortOrder    Int        @default(0)

  @@index([productionId])
}

model ProductionChorusRole {
  id           String     @id @default(cuid())
  productionId String
  production   Production @relation(fields: [productionId], references: [id], onDelete: Cascade)
  name         String
  sortOrder    Int        @default(0)

  @@index([productionId])
}

model ProductionInterior {
  id           String     @id @default(cuid())
  productionId String
  production   Production @relation(fields: [productionId], references: [id], onDelete: Cascade)
  name         String
  sortOrder    Int        @default(0)

  @@index([productionId])
}

model ProductionHazard {
  id           String     @id @default(cuid())
  productionId String
  production   Production @relation(fields: [productionId], references: [id], onDelete: Cascade)
  name         String
  sortOrder    Int        @default(0)

  @@index([productionId])
}
```

- [ ] **Step 3: Creare la cartella migration e scrivere `migration.sql`**

```bash
cd ~/Projects/LaScala
mkdir -p prisma/migrations/20260526200000_add_production_scheda
```

Contenuto di `prisma/migrations/20260526200000_add_production_scheda/migration.sql`:

```sql
-- AlterTable
ALTER TABLE "Production" ADD COLUMN "plot" TEXT;
ALTER TABLE "Production" ADD COLUMN "schedaNotes" TEXT;

-- CreateTable
CREATE TABLE "ProductionAct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProductionAct_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductionChorusRole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProductionChorusRole_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductionInterior" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProductionInterior_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductionHazard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProductionHazard_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "Production" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ProductionAct_productionId_idx" ON "ProductionAct"("productionId");
CREATE INDEX "ProductionChorusRole_productionId_idx" ON "ProductionChorusRole"("productionId");
CREATE INDEX "ProductionInterior_productionId_idx" ON "ProductionInterior"("productionId");
CREATE INDEX "ProductionHazard_productionId_idx" ON "ProductionHazard"("productionId");
```

- [ ] **Step 4: Applicare la migration al DB di sviluppo e rigenerare il client Prisma**

```bash
cd ~/Projects/LaScala
npm run migrate
npx prisma generate
```

Expected: `npm run migrate` stampa che applica la migration `20260526200000_add_production_scheda`. `prisma generate` aggiorna `src/generated/prisma/`.

- [ ] **Step 5: Verifica che lo schema sia stato applicato**

```bash
sqlite3 prisma/dev.db ".schema ProductionAct"
```

Expected: stampa la `CREATE TABLE` di `ProductionAct` con tutte le colonne.

- [ ] **Step 6: Commit**

```bash
cd ~/Projects/LaScala
git add prisma/schema.prisma prisma/migrations/20260526200000_add_production_scheda/
git commit -m "feat(prisma): add ProductionScheda models and migration"
```

---

## Task 2: Validatore puro `src/lib/scheda.ts`

**Files:**
- Create: `src/lib/scheda.ts`
- Create: `tests/lib/scheda.test.ts`

- [ ] **Step 1: Scrivere i test in `tests/lib/scheda.test.ts`**

```ts
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
```

- [ ] **Step 2: Eseguire i test (devono fallire perché il modulo non esiste)**

```bash
cd ~/Projects/LaScala
npm test -- tests/lib/scheda.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/scheda'`.

- [ ] **Step 3: Implementare `src/lib/scheda.ts`**

```ts
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

function validateList<T>(
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
  if (r.title.length < 1 || r.title.length > MAX_NAME) return `title must be 1-${MAX_NAME} chars`;
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
  if (r.name.length < 1 || r.name.length > MAX_NAME) return `name must be 1-${MAX_NAME} chars`;
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
```

- [ ] **Step 4: Eseguire i test (devono passare)**

```bash
cd ~/Projects/LaScala
npm test -- tests/lib/scheda.test.ts
```

Expected: 8 test passano.

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/LaScala
git add src/lib/scheda.ts tests/lib/scheda.test.ts
git commit -m "feat(scheda): add payload validator with unit tests"
```

---

## Task 3: API `GET /api/productions/[id]/scheda`

**Files:**
- Create: `src/app/api/productions/[id]/scheda/route.ts`
- Create: `tests/api/productions-scheda.test.ts`

- [ ] **Step 1: Scrivere il primo test (404 su production inesistente)**

Crea `tests/api/productions-scheda.test.ts`:

```ts
import { describe, it, expect, afterEach } from "vitest";
import type { NextRequest } from "next/server";
import { createTestPrisma, seedMinimalProduction } from "../setup";
import { GET, PUT } from "@/app/api/productions/[id]/scheda/route";

function makeGetReq(): NextRequest {
  return new Request("http://test/", { method: "GET" }) as NextRequest;
}
function makePutReq(body: object): NextRequest {
  return new Request("http://test/", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as NextRequest;
}

describe("GET /api/productions/[id]/scheda", () => {
  let cleanupFn: () => void;
  afterEach(() => { cleanupFn?.(); });

  it("returns 404 when production does not exist", async () => {
    const { prisma, cleanup, dbUrl } = await createTestPrisma();
    process.env.DATABASE_URL = dbUrl;
    cleanupFn = () => { cleanup(); delete process.env.DATABASE_URL; };
    try {
      const res = await GET(makeGetReq(), { params: Promise.resolve({ id: "does-not-exist" }) });
      expect(res.status).toBe(404);
    } finally {
      await prisma.$disconnect();
    }
  });

  it("returns empty scheda for a freshly seeded production", async () => {
    const { prisma, cleanup, dbUrl } = await createTestPrisma();
    process.env.DATABASE_URL = dbUrl;
    cleanupFn = () => { cleanup(); delete process.env.DATABASE_URL; };
    try {
      const { production } = await seedMinimalProduction(prisma);
      const res = await GET(makeGetReq(), { params: Promise.resolve({ id: production.id }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({
        plot: null,
        schedaNotes: null,
        acts: [],
        chorusRoles: [],
        interiors: [],
        hazards: [],
      });
    } finally {
      await prisma.$disconnect();
    }
  });
});
```

- [ ] **Step 2: Eseguire i test (devono fallire — modulo non esiste)**

```bash
cd ~/Projects/LaScala
npm test -- tests/api/productions-scheda.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/productions/[id]/scheda/route'`.

- [ ] **Step 3: Implementare il route handler con `GET` e stub `PUT`**

Crea `src/app/api/productions/[id]/scheda/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateSchedaPayload } from "@/lib/scheda";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const production = await prisma.production.findUnique({
    where: { id },
    select: {
      id: true,
      plot: true,
      schedaNotes: true,
      acts: { orderBy: { sortOrder: "asc" }, select: { id: true, title: true, description: true } },
      chorusRoles: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true } },
      interiors: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true } },
      hazards: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true } },
    },
  });
  if (!production) return NextResponse.json({ error: "Production not found" }, { status: 404 });
  return NextResponse.json({
    plot: production.plot,
    schedaNotes: production.schedaNotes,
    acts: production.acts,
    chorusRoles: production.chorusRoles,
    interiors: production.interiors,
    hazards: production.hazards,
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Implemented in next task.
  void req; void id; void validateSchedaPayload;
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
```

- [ ] **Step 4: Eseguire i test (i due `GET` devono passare)**

```bash
cd ~/Projects/LaScala
npm test -- tests/api/productions-scheda.test.ts
```

Expected: 2 test passano.

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/LaScala
git add src/app/api/productions/[id]/scheda/route.ts tests/api/productions-scheda.test.ts
git commit -m "feat(api): add GET /api/productions/[id]/scheda"
```

---

## Task 4: API `PUT /api/productions/[id]/scheda`

**Files:**
- Modify: `src/app/api/productions/[id]/scheda/route.ts`
- Modify: `tests/api/productions-scheda.test.ts`

- [ ] **Step 1: Aggiungere i test del `PUT` in `tests/api/productions-scheda.test.ts`**

Aggiungi alla fine del file (dentro un nuovo `describe`):

```ts
describe("PUT /api/productions/[id]/scheda", () => {
  let cleanupFn: () => void;
  afterEach(() => { cleanupFn?.(); });

  const fullPayload = {
    plot: "Una storia di amore e tradimento.",
    schedaNotes: "Ricorda di chiedere il bandolo a Tizio.",
    acts: [
      { title: "Atto I", description: "Chiesa di Sant'Andrea della Valle" },
      { title: "Atto II", description: "Palazzo Farnese" },
    ],
    chorusRoles: [{ name: "Soldati" }, { name: "Popolane" }],
    interiors: [{ name: "Sagrestia" }, { name: "Studio di Cavaradossi" }],
    hazards: [{ name: "Pistola scenica" }, { name: "Fumo Atto III" }],
  };

  it("returns 404 when production does not exist", async () => {
    const { prisma, cleanup, dbUrl } = await createTestPrisma();
    process.env.DATABASE_URL = dbUrl;
    cleanupFn = () => { cleanup(); delete process.env.DATABASE_URL; };
    try {
      const res = await PUT(makePutReq(fullPayload), { params: Promise.resolve({ id: "missing" }) });
      expect(res.status).toBe(404);
    } finally {
      await prisma.$disconnect();
    }
  });

  it("returns 400 on invalid payload", async () => {
    const { prisma, cleanup, dbUrl } = await createTestPrisma();
    process.env.DATABASE_URL = dbUrl;
    cleanupFn = () => { cleanup(); delete process.env.DATABASE_URL; };
    try {
      const { production } = await seedMinimalProduction(prisma);
      const res = await PUT(
        makePutReq({ plot: "x", schedaNotes: null, acts: [{ title: "", description: null }], chorusRoles: [], interiors: [], hazards: [] }),
        { params: Promise.resolve({ id: production.id }) },
      );
      expect(res.status).toBe(400);
    } finally {
      await prisma.$disconnect();
    }
  });

  it("round-trips a full payload via GET", async () => {
    const { prisma, cleanup, dbUrl } = await createTestPrisma();
    process.env.DATABASE_URL = dbUrl;
    cleanupFn = () => { cleanup(); delete process.env.DATABASE_URL; };
    try {
      const { production } = await seedMinimalProduction(prisma);
      const putRes = await PUT(makePutReq(fullPayload), { params: Promise.resolve({ id: production.id }) });
      expect(putRes.status).toBe(200);

      const getRes = await GET(makeGetReq(), { params: Promise.resolve({ id: production.id }) });
      const json = await getRes.json();
      expect(json.plot).toBe(fullPayload.plot);
      expect(json.schedaNotes).toBe(fullPayload.schedaNotes);
      expect(json.acts.map((a: { title: string; description: string | null }) => ({ title: a.title, description: a.description })))
        .toEqual(fullPayload.acts);
      expect(json.chorusRoles.map((c: { name: string }) => ({ name: c.name }))).toEqual(fullPayload.chorusRoles);
      expect(json.interiors.map((c: { name: string }) => ({ name: c.name }))).toEqual(fullPayload.interiors);
      expect(json.hazards.map((c: { name: string }) => ({ name: c.name }))).toEqual(fullPayload.hazards);
    } finally {
      await prisma.$disconnect();
    }
  });

  it("replace-all: second PUT removes items not in the new payload", async () => {
    const { prisma, cleanup, dbUrl } = await createTestPrisma();
    process.env.DATABASE_URL = dbUrl;
    cleanupFn = () => { cleanup(); delete process.env.DATABASE_URL; };
    try {
      const { production } = await seedMinimalProduction(prisma);
      await PUT(makePutReq(fullPayload), { params: Promise.resolve({ id: production.id }) });
      const shrunk = {
        plot: null, schedaNotes: null,
        acts: [{ title: "Atto unico", description: null }],
        chorusRoles: [], interiors: [], hazards: [],
      };
      await PUT(makePutReq(shrunk), { params: Promise.resolve({ id: production.id }) });

      const acts = await prisma.productionAct.findMany({ where: { productionId: production.id } });
      const chorus = await prisma.productionChorusRole.findMany({ where: { productionId: production.id } });
      expect(acts).toHaveLength(1);
      expect(acts[0].title).toBe("Atto unico");
      expect(chorus).toHaveLength(0);
    } finally {
      await prisma.$disconnect();
    }
  });

  it("preserves order via sortOrder", async () => {
    const { prisma, cleanup, dbUrl } = await createTestPrisma();
    process.env.DATABASE_URL = dbUrl;
    cleanupFn = () => { cleanup(); delete process.env.DATABASE_URL; };
    try {
      const { production } = await seedMinimalProduction(prisma);
      await PUT(makePutReq({
        ...fullPayload,
        hazards: [{ name: "Z" }, { name: "A" }, { name: "M" }],
      }), { params: Promise.resolve({ id: production.id }) });

      const res = await GET(makeGetReq(), { params: Promise.resolve({ id: production.id }) });
      const json = await res.json();
      expect(json.hazards.map((h: { name: string }) => h.name)).toEqual(["Z", "A", "M"]);
    } finally {
      await prisma.$disconnect();
    }
  });
});
```

- [ ] **Step 2: Eseguire i test (i `PUT` devono fallire perché restituisce 501)**

```bash
cd ~/Projects/LaScala
npm test -- tests/api/productions-scheda.test.ts
```

Expected: 5 nuovi test falliscono.

- [ ] **Step 3: Sostituire l'implementazione di `PUT` in `src/app/api/productions/[id]/scheda/route.ts`**

Sostituisci la funzione `PUT` (dopo `GET`) con:

```ts
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const validation = validateSchedaPayload(raw);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const payload = validation.value;

  try {
    const exists = await prisma.production.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "Production not found" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.production.update({
        where: { id },
        data: { plot: payload.plot, schedaNotes: payload.schedaNotes },
      });
      await tx.productionAct.deleteMany({ where: { productionId: id } });
      await tx.productionChorusRole.deleteMany({ where: { productionId: id } });
      await tx.productionInterior.deleteMany({ where: { productionId: id } });
      await tx.productionHazard.deleteMany({ where: { productionId: id } });
      if (payload.acts.length > 0) {
        await tx.productionAct.createMany({
          data: payload.acts.map((a, i) => ({
            productionId: id, title: a.title, description: a.description, sortOrder: i,
          })),
        });
      }
      if (payload.chorusRoles.length > 0) {
        await tx.productionChorusRole.createMany({
          data: payload.chorusRoles.map((x, i) => ({ productionId: id, name: x.name, sortOrder: i })),
        });
      }
      if (payload.interiors.length > 0) {
        await tx.productionInterior.createMany({
          data: payload.interiors.map((x, i) => ({ productionId: id, name: x.name, sortOrder: i })),
        });
      }
      if (payload.hazards.length > 0) {
        await tx.productionHazard.createMany({
          data: payload.hazards.map((x, i) => ({ productionId: id, name: x.name, sortOrder: i })),
        });
      }
    });

    const updated = await prisma.production.findUnique({
      where: { id },
      select: {
        plot: true,
        schedaNotes: true,
        acts: { orderBy: { sortOrder: "asc" }, select: { id: true, title: true, description: true } },
        chorusRoles: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true } },
        interiors: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true } },
        hazards: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true } },
      },
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PUT /api/productions/[id]/scheda]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
```

E rimuovi la riga `void req; void id; void validateSchedaPayload;` dalla precedente implementazione stub.

- [ ] **Step 4: Eseguire tutti i test del file (devono passare)**

```bash
cd ~/Projects/LaScala
npm test -- tests/api/productions-scheda.test.ts
```

Expected: 7 test passano (2 GET + 5 PUT).

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/LaScala
git add src/app/api/productions/[id]/scheda/route.ts tests/api/productions-scheda.test.ts
git commit -m "feat(api): implement PUT /api/productions/[id]/scheda with replace-all"
```

---

## Task 5: Componente `<Textarea>` shadcn

**Files:**
- Create: `src/components/ui/textarea.tsx`

- [ ] **Step 1: Creare il componente `src/components/ui/textarea.tsx`**

Stile coerente con `input.tsx` esistente:

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
        "ring-offset-background placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export { Textarea };
```

- [ ] **Step 2: Verificare che TypeScript compili**

```bash
cd ~/Projects/LaScala
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/LaScala
git add src/components/ui/textarea.tsx
git commit -m "feat(ui): add shadcn Textarea component"
```

---

## Task 6: Componente `<StringListEditor>`

**Files:**
- Create: `src/components/StringListEditor.tsx`

- [ ] **Step 1: Creare `src/components/StringListEditor.tsx`**

```tsx
"use client";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type StringItem = { id?: string; name: string };

interface Props {
  label: string;
  items: StringItem[];
  onChange: (items: StringItem[]) => void;
  placeholder?: string;
}

export default function StringListEditor({ label, items, onChange, placeholder }: Props) {
  const update = (i: number, patch: Partial<StringItem>) => {
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, { name: "" }]);
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">Nessuna voce. Aggiungine una.</p>
      )}
      {items.map((it, i) => (
        <div key={it.id ?? `new-${i}`} className="flex items-center gap-2">
          <Input
            value={it.name}
            placeholder={placeholder}
            onChange={(e) => update(i, { name: e.target.value })}
            aria-label={`${label} #${i + 1}`}
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Sposta su">
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Sposta giù">
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} aria-label="Rimuovi">
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="mr-2 h-4 w-4" />
        Aggiungi
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Verificare che TypeScript compili**

```bash
cd ~/Projects/LaScala
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/LaScala
git add src/components/StringListEditor.tsx
git commit -m "feat(ui): add StringListEditor component"
```

---

## Task 7: `SchedaForm` client component

**Files:**
- Create: `src/app/productions/[id]/scheda/SchedaForm.tsx`

- [ ] **Step 1: Creare `src/app/productions/[id]/scheda/SchedaForm.tsx`**

```tsx
"use client";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StringListEditor, { type StringItem } from "@/components/StringListEditor";

type ActItem = { id?: string; title: string; description: string | null };

export type SchedaInitialData = {
  plot: string | null;
  schedaNotes: string | null;
  acts: { id: string; title: string; description: string | null }[];
  chorusRoles: { id: string; name: string }[];
  interiors: { id: string; name: string }[];
  hazards: { id: string; name: string }[];
};

export type OperaInfo = {
  title: string;
  composer: string | null;
  characters: { id: string; roleTitle: string; characterName: string | null }[];
};

interface Props {
  productionId: string;
  initial: SchedaInitialData;
  opera: OperaInfo;
}

export default function SchedaForm({ productionId, initial, opera }: Props) {
  const [plot, setPlot] = useState(initial.plot ?? "");
  const [schedaNotes, setSchedaNotes] = useState(initial.schedaNotes ?? "");
  const [acts, setActs] = useState<ActItem[]>(initial.acts);
  const [chorusRoles, setChorusRoles] = useState<StringItem[]>(initial.chorusRoles);
  const [interiors, setInteriors] = useState<StringItem[]>(initial.interiors);
  const [hazards, setHazards] = useState<StringItem[]>(initial.hazards);
  const [saving, setSaving] = useState(false);

  const updateAct = (i: number, patch: Partial<ActItem>) => {
    setActs((curr) => curr.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  };
  const removeAct = (i: number) => setActs((curr) => curr.filter((_, idx) => idx !== i));
  const addAct = () => setActs((curr) => [...curr, { title: "", description: null }]);
  const moveAct = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    setActs((curr) => {
      if (j < 0 || j >= curr.length) return curr;
      const next = curr.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const submit = async () => {
    setSaving(true);
    try {
      const body = {
        plot: plot.trim() === "" ? null : plot,
        schedaNotes: schedaNotes.trim() === "" ? null : schedaNotes,
        acts: acts
          .filter((a) => a.title.trim() !== "")
          .map((a) => ({ title: a.title, description: a.description })),
        chorusRoles: chorusRoles.filter((x) => x.name.trim() !== "").map((x) => ({ name: x.name })),
        interiors: interiors.filter((x) => x.name.trim() !== "").map((x) => ({ name: x.name })),
        hazards: hazards.filter((x) => x.name.trim() !== "").map((x) => ({ name: x.name })),
      };
      const res = await fetch(`/api/productions/${productionId}/scheda`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      toast.success("Scheda salvata");
    } catch (e) {
      toast.error(`Errore nel salvataggio: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <Card>
        <CardHeader><CardTitle>Dati dell&apos;opera</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div><span className="font-medium">Titolo:</span> {opera.title}</div>
          <div><span className="font-medium">Compositore:</span> {opera.composer ?? "—"}</div>
          <div>
            <span className="font-medium">Personaggi:</span>{" "}
            {opera.characters.length === 0
              ? "—"
              : opera.characters.map((c) => c.characterName ?? c.roleTitle).join(", ")}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Trama</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={plot} onChange={(e) => setPlot(e.target.value)} rows={8} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Divisione in atti</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {acts.length === 0 && <p className="text-sm text-muted-foreground">Nessun atto. Aggiungine uno.</p>}
          {acts.map((a, i) => (
            <div key={a.id ?? `new-${i}`} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={a.title}
                  placeholder="Titolo (es. Atto I)"
                  onChange={(e) => updateAct(i, { title: e.target.value })}
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => moveAct(i, -1)} disabled={i === 0} aria-label="Sposta su">
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => moveAct(i, 1)} disabled={i === acts.length - 1} aria-label="Sposta giù">
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeAct(i)} aria-label="Rimuovi">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                value={a.description ?? ""}
                placeholder="Descrizione / ambientazione (opzionale)"
                onChange={(e) => updateAct(i, { description: e.target.value === "" ? null : e.target.value })}
                rows={3}
              />
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addAct}>
            <Plus className="mr-2 h-4 w-4" /> Aggiungi atto
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Ruoli del coro</CardTitle></CardHeader>
        <CardContent>
          <StringListEditor label="Ruolo coro" items={chorusRoles} onChange={setChorusRoles} placeholder="Es. Soldati" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Interni</CardTitle></CardHeader>
        <CardContent>
          <StringListEditor label="Interno" items={interiors} onChange={setInteriors} placeholder="Es. Sagrestia" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Hazards (armi / effetti speciali)</CardTitle></CardHeader>
        <CardContent>
          <StringListEditor label="Hazard" items={hazards} onChange={setHazards} placeholder="Es. Pistola scenica" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Note da ricordare</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={schedaNotes} onChange={(e) => setSchedaNotes(e.target.value)} rows={6} />
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-3 flex justify-end">
        <Button onClick={submit} disabled={saving}>
          {saving ? "Salvataggio…" : "Salva scheda"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificare che TypeScript compili**

```bash
cd ~/Projects/LaScala
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/LaScala
git add src/app/productions/\[id\]/scheda/SchedaForm.tsx
git commit -m "feat(ui): add SchedaForm client component"
```

---

## Task 8: Pagina server `/productions/[id]/scheda`

**Files:**
- Create: `src/app/productions/[id]/scheda/page.tsx`

- [ ] **Step 1: Creare `src/app/productions/[id]/scheda/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import SchedaForm, { type SchedaInitialData, type OperaInfo } from "./SchedaForm";

export default async function SchedaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const production = await prisma.production.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      composer: true,
      plot: true,
      schedaNotes: true,
      acts: { orderBy: { sortOrder: "asc" }, select: { id: true, title: true, description: true } },
      chorusRoles: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true } },
      interiors: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true } },
      hazards: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true } },
      members: {
        where: { department: "CAST" },
        select: { id: true, roleTitle: true, characterName: true },
        orderBy: { roleTitle: "asc" },
      },
    },
  });
  if (!production) notFound();

  const initial: SchedaInitialData = {
    plot: production.plot,
    schedaNotes: production.schedaNotes,
    acts: production.acts,
    chorusRoles: production.chorusRoles,
    interiors: production.interiors,
    hazards: production.hazards,
  };
  const opera: OperaInfo = {
    title: production.title,
    composer: production.composer,
    characters: production.members,
  };

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <div className="mb-6 flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/productions/${production.id}`}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Torna alla produzione
          </Link>
        </Button>
      </div>
      <h1 className="mb-6 text-2xl font-bold">Scheda opera — {production.title}</h1>
      <SchedaForm productionId={production.id} initial={initial} opera={opera} />
    </div>
  );
}
```

- [ ] **Step 2: Verificare che TypeScript compili**

```bash
cd ~/Projects/LaScala
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/LaScala
git add src/app/productions/\[id\]/scheda/page.tsx
git commit -m "feat(ui): add /productions/[id]/scheda page"
```

---

## Task 9: Link "Scheda opera" nella pagina production

**Files:**
- Modify: `src/app/productions/[id]/page.tsx`

- [ ] **Step 1: Aprire `src/app/productions/[id]/page.tsx` e identificare il punto di inserimento**

Cerca il blocco dei pulsanti vicino al titolo della produzione (es. cerca "showProdEdit" o il bottone `Pencil`/`Modifica`). Aggiungerai un nuovo link/bottone "Scheda opera" accanto.

- [ ] **Step 2: Aggiungere il link**

Trova il punto subito dopo l'apertura della Card principale della produzione (dove è mostrato il titolo, di solito attorno al primo `<CardHeader>` o ai pulsanti di azione produzione). Aggiungi:

```tsx
<Button asChild variant="outline" size="sm">
  <Link href={`/productions/${id}/scheda`}>Scheda opera</Link>
</Button>
```

`Link` e `Button` sono già importati nel file. Posizionalo nella stessa riga/gruppo dei pulsanti di azione esistenti (vicino al "Modifica produzione" o equivalente).

- [ ] **Step 3: Verificare che TypeScript compili**

```bash
cd ~/Projects/LaScala
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd ~/Projects/LaScala
git add src/app/productions/\[id\]/page.tsx
git commit -m "feat(ui): link Scheda opera from production page"
```

---

## Task 10: Verifica manuale end-to-end

**Files:** nessuno (test manuale).

- [ ] **Step 1: Avviare il dev server**

```bash
cd ~/Projects/LaScala
npm run dev
```

Expected: server in ascolto su `http://localhost:3000`.

- [ ] **Step 2: Navigare a una produzione esistente**

Apri `http://localhost:3000/productions` nel browser, scegli una produzione (o creane una nuova se il DB è vuoto). Verifica la presenza del bottone "Scheda opera".

- [ ] **Step 3: Aprire la scheda e compilarla**

Click "Scheda opera". Verifica:
- Sezione "Dati dell'opera" mostra titolo, compositore, personaggi cast (se presenti).
- Tutte le altre sezioni iniziano vuote.
- Aggiungi una trama, due atti, due ruoli del coro, un interno, un hazard, una nota.
- Riordina un atto e una voce di lista.
- Rimuovi una voce.
- Click "Salva scheda" → atteso toast verde "Scheda salvata".

- [ ] **Step 4: Refresh della pagina**

Ricarica la pagina. Verifica che tutti i dati siano persistiti e mostrati nell'ordine corretto.

- [ ] **Step 5: Test edge: scheda vuota**

Svuota tutti i campi (trama, note, tutte le liste). Salva. Refresh. Verifica che ricarichi tutto vuoto senza errori.

- [ ] **Step 6: Spegnere dev server**

`Ctrl+C` nel terminale dove gira `npm run dev`.

- [ ] **Step 7: Final test run (suite intera)**

```bash
cd ~/Projects/LaScala
npm test
```

Expected: tutti i test esistenti + i nuovi (8 lib + 7 api) passano.

- [ ] **Step 8: Lint check**

```bash
cd ~/Projects/LaScala
npm run lint
```

Expected: no errors.

- [ ] **Step 9: Commit (solo se sono state fatte correzioni)**

Se durante la verifica manuale hai aggiustato qualcosa, fai un commit di finalizzazione. Altrimenti skip.

```bash
git add -A
git commit -m "fix(scheda): manual verification adjustments"
```

---

## Verifica finale

Quando tutte le task sono complete:
- [ ] 8 unit test di `scheda.ts` passano
- [ ] 7 integration test dell'API passano
- [ ] La pagina `/productions/[id]/scheda` funziona end-to-end nel browser
- [ ] Il link "Scheda opera" è visibile e cliccabile dalla pagina della produzione
- [ ] `npm run lint` passa
- [ ] `npx tsc --noEmit` passa
