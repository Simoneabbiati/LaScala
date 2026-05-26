# Chiamate ODG raggruppate per luogo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sostituire il raggruppamento per dipartimento delle "Chiamate individuali" nella pagina di compilazione ODG con un raggruppamento per luogo, ordinato per orario di inizio.

**Architecture:** Logica di raggruppamento estratta in funzione pura testabile in `src/lib/entry-grouping.ts`. Modifica esclusivamente client-side: nessun cambio ad API, schema Prisma, PDF o Word export. Il reparto resta identificabile sulla riga tramite tinta di sfondo dal `deptBg` esistente.

**Tech Stack:** Next.js (App Router, fork patched in `node_modules/next/dist/docs/`), React 19, TypeScript, Vitest, Prisma. Path alias `@/...` → `src/...`.

**Spec di riferimento:** [docs/superpowers/specs/2026-05-26-odg-chiamate-by-location-design.md](../specs/2026-05-26-odg-chiamate-by-location-design.md)

---

## File Structure

| File | Operazione | Responsabilità |
|------|-----------|----------------|
| `src/lib/entry-grouping.ts` | **Create** | Funzione pura `groupEntriesByLocation` + tipo `EntryGroup<T>` |
| `tests/lib/entry-grouping.test.ts` | **Create** | Test unitari Vitest sul raggruppamento e ordinamento |
| `src/app/productions/[id]/odg/[odgId]/page.tsx` | **Modify** | Sostituisce `entriesByDept` con `entryGroups`; aggiorna render della sezione "Chiamate individuali"; aggiorna `entryRow` (colonna Luogo rimossa, tinta riga aggiunta) |

---

## Task 1: Funzione pura `groupEntriesByLocation` con test

**Files:**
- Create: `src/lib/entry-grouping.ts`
- Test: `tests/lib/entry-grouping.test.ts`

La funzione è generica sul tipo `T` dell'entry (così il test non dipende dal tipo `OdgEntry` definito inline in `page.tsx`). Richiede solo le proprietà minime: `startTime`, `endTime`, `location?`, `member.person?.name`, `member.roleTitle`.

- [ ] **Step 1: Scrivere `tests/lib/entry-grouping.test.ts` con test che fallisce**

```ts
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
```

- [ ] **Step 2: Lanciare il test per verificare che fallisca**

Run: `npm test -- tests/lib/entry-grouping.test.ts`
Expected: FAIL with module-not-found per `@/lib/entry-grouping` o errore di import.

- [ ] **Step 3: Implementare `src/lib/entry-grouping.ts`**

```ts
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
```

- [ ] **Step 4: Lanciare il test per verificare che passi**

Run: `npm test -- tests/lib/entry-grouping.test.ts`
Expected: PASS (10 test).

- [ ] **Step 5: Commit**

```bash
git add src/lib/entry-grouping.ts tests/lib/entry-grouping.test.ts
git commit -m "feat(odg): add groupEntriesByLocation pure helper with tests"
```

---

## Task 2: Integrare il raggruppamento in `page.tsx`

**Files:**
- Modify: `src/app/productions/[id]/odg/[odgId]/page.tsx` (lines 4, 267-274, 290-366, 697-749)

Sostituisce `entriesByDept` con `entryGroups`. Riscrive il rendering della colonna destra. Aggiorna `entryRow` rimuovendo la `<TableCell>` "Luogo" e applicando `backgroundColor` dal `deptBg`.

Lasciare invariati: `fullDeptOrder` (serve al `<select>` "Persona" alle righe ~640-658), il form "Aggiungi chiamata", l'edit-in-place, il delete, la sezione SINISTRA "Programma del giorno", il `<TableCell>` "Luogo" all'interno del form di edit (righe 309-312) — l'utente lo modifica ancora.

- [ ] **Step 1: Aggiornare gli import in cima al file**

In [page.tsx:4](src/app/productions/[id]/odg/[odgId]/page.tsx#L4), aggiungere `MapPin` agli import di `lucide-react` (servirà come icona dell'header del gruppo-luogo):

Vecchio:
```ts
import { ChevronRight, Check, FileDown, FileText, Pencil, Plus, Trash2, X } from "lucide-react";
```

Nuovo:
```ts
import { ChevronRight, Check, FileDown, FileText, MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
```

Subito dopo gli import esistenti del blocco (dopo la riga 14 `import { toast } from "sonner";`), aggiungere:

```ts
import { groupEntriesByLocation } from "@/lib/entry-grouping";
```

- [ ] **Step 2: Sostituire il calcolo di raggruppamento**

In [page.tsx:267-274](src/app/productions/[id]/odg/[odgId]/page.tsx#L267-L274), individuare:

```ts
  const entryCustomDepts = [...new Set(
    odg.entries.map((e) => e.member.department).filter((d) => !deptOrder.includes(d))
  )];
  const fullDeptOrder = [...deptOrder, ...entryCustomDepts];
  const entriesByDept = fullDeptOrder.reduce<Record<string, OdgEntry[]>>((acc, dept) => {
    acc[dept] = odg.entries.filter((e) => e.member.department === dept);
    return acc;
  }, {});
```

Sostituire con (rimuove `entriesByDept`, aggiunge `entryGroups`; `entryCustomDepts` e `fullDeptOrder` restano perché usati dal `<select>` "Persona"):

```ts
  const entryCustomDepts = [...new Set(
    odg.entries.map((e) => e.member.department).filter((d) => !deptOrder.includes(d))
  )];
  const fullDeptOrder = [...deptOrder, ...entryCustomDepts];
  const entryGroups = groupEntriesByLocation(odg.entries);
```

- [ ] **Step 3: Aggiornare `entryRow` — rimuovere la colonna "Luogo" e applicare tinta riga**

In [page.tsx:321-365](src/app/productions/[id]/odg/[odgId]/page.tsx#L321-L365), il blocco `return (<TableRow ...>)` per la riga non-editing. Trovare:

```tsx
    return (
      <TableRow key={entry.id} className="group">
        <TableCell>
          {isExtras ? (
            <>
              <div className="font-medium text-sm">{entry.member.roleTitle}</div>
              {entry.characterName && <div className="text-xs text-muted-foreground">× {entry.characterName}</div>}
            </>
          ) : entry.member.person?.name ? (
            <>
              <div className="font-medium text-sm">{entry.member.person.name}</div>
              {entry.member.department === "CAST" ? (
                <div className="text-xs text-muted-foreground italic">{(entry.characterName ?? entry.member.characterName) || "—"}</div>
              ) : (
                <div className="text-xs text-muted-foreground italic">{entry.member.roleTitle}</div>
              )}
            </>
          ) : (
            // No person attached: either a section (Coro, Orchestra…) with optional conductor, or an unfilled role slot
            <>
              <div className="font-medium text-sm">{entry.member.roleTitle}</div>
              {entry.member.conductorName && (
                <div className="text-xs text-muted-foreground italic">M.o {entry.member.conductorName}</div>
              )}
            </>
          )}
        </TableCell>
        <TableCell className="font-mono text-sm">{entry.startTime} – {entry.endTime}</TableCell>
        <TableCell className="text-sm">{entry.activity}</TableCell>
        <TableCell className="text-sm text-muted-foreground">{entry.location?.name ?? "—"}</TableCell>
        <TableCell className="text-sm text-muted-foreground">{entry.notes ?? "—"}</TableCell>
        <TableCell>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground"
              onClick={() => setEditEntry({ id: entry.id, startTime: entry.startTime, endTime: entry.endTime, activity: entry.activity, locationId: entry.location?.id ?? "", notes: entry.notes ?? "", characterName: entry.characterName ?? entry.member.characterName ?? "" })}>
              <Pencil size={12} />
            </Button>
            <Button size="icon" variant="ghost-destructive" className="h-7 w-7"
              onClick={() => deleteEntry(entry.id, isExtras ? entry.member.roleTitle : (entry.member.person?.name ?? entry.member.roleTitle))}>
              <Trash2 size={12} />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
```

Sostituire con (riga `<TableRow>` riceve `style` con backgroundColor dal `deptBg`, con fallback CAST per CAST_EXTRAS; la `<TableCell>` "Luogo" è rimossa):

```tsx
    const rowBg = deptBg[entry.member.department]
      ?? (entry.member.department === "CAST_EXTRAS" ? deptBg["CAST"] : undefined);
    return (
      <TableRow key={entry.id} className="group" style={rowBg ? { backgroundColor: rowBg } : undefined}>
        <TableCell>
          {isExtras ? (
            <>
              <div className="font-medium text-sm">{entry.member.roleTitle}</div>
              {entry.characterName && <div className="text-xs text-muted-foreground">× {entry.characterName}</div>}
            </>
          ) : entry.member.person?.name ? (
            <>
              <div className="font-medium text-sm">{entry.member.person.name}</div>
              {entry.member.department === "CAST" ? (
                <div className="text-xs text-muted-foreground italic">{(entry.characterName ?? entry.member.characterName) || "—"}</div>
              ) : (
                <div className="text-xs text-muted-foreground italic">{entry.member.roleTitle}</div>
              )}
            </>
          ) : (
            // No person attached: either a section (Coro, Orchestra…) with optional conductor, or an unfilled role slot
            <>
              <div className="font-medium text-sm">{entry.member.roleTitle}</div>
              {entry.member.conductorName && (
                <div className="text-xs text-muted-foreground italic">M.o {entry.member.conductorName}</div>
              )}
            </>
          )}
        </TableCell>
        <TableCell className="font-mono text-sm">{entry.startTime} – {entry.endTime}</TableCell>
        <TableCell className="text-sm">{entry.activity}</TableCell>
        <TableCell className="text-sm text-muted-foreground">{entry.notes ?? "—"}</TableCell>
        <TableCell>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground"
              onClick={() => setEditEntry({ id: entry.id, startTime: entry.startTime, endTime: entry.endTime, activity: entry.activity, locationId: entry.location?.id ?? "", notes: entry.notes ?? "", characterName: entry.characterName ?? entry.member.characterName ?? "" })}>
              <Pencil size={12} />
            </Button>
            <Button size="icon" variant="ghost-destructive" className="h-7 w-7"
              onClick={() => deleteEntry(entry.id, isExtras ? entry.member.roleTitle : (entry.member.person?.name ?? entry.member.roleTitle))}>
              <Trash2 size={12} />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
```

Il blocco di edit-in-place (`if (editEntry?.id === entry.id)` alle righe 291-319) **non viene modificato**: usa `colSpan={6}` che resta valido perché il form non dipende dal numero di colonne della tabella di display (è una riga unica con un form interno).

NOTA: cambiamo `colSpan` da 6 a 5 per riflettere il nuovo numero di colonne. Trovare in [page.tsx:294](src/app/productions/[id]/odg/[odgId]/page.tsx#L294):

```tsx
          <TableCell colSpan={6}>
```

Sostituire con:

```tsx
          <TableCell colSpan={5}>
```

- [ ] **Step 4: Sostituire il rendering della sezione "Chiamate individuali"**

In [page.tsx:697-749](src/app/productions/[id]/odg/[odgId]/page.tsx#L697-L749), individuare l'intero blocco:

```tsx
              <div className="space-y-3">
                {fullDeptOrder.map((dept) => {
                  if (dept === "CAST_EXTRAS") return null;
                  const entries = entriesByDept[dept] ?? [];
                  const extrasEntries = dept === "CAST" ? (entriesByDept["CAST_EXTRAS"] ?? []) : [];
                  const linked = linkedByParent[dept] ?? [];
                  const linkedEntries = linked.flatMap((ld) => entriesByDept[ld.value] ?? []);
                  if (!entries.length && !extrasEntries.length && !linkedEntries.length) return null;

                  const deptSectionLabel = dept === "CAST" ? "Compagnia" : (deptLabel[dept] ?? dept);
                  const deptSectionBg = deptBg[dept] ?? "#e5e5e544";
                  const showSolistiHeader = dept === "CAST" && extrasEntries.length > 0 && entries.length > 0;

                  return (
                    <Card key={dept} className="overflow-hidden">
                      <div className="px-4 py-2 text-sm font-semibold" style={{ backgroundColor: deptSectionBg }}>{deptSectionLabel}</div>
                      {entries.length > 0 && (
                        <>
                          {showSolistiHeader && (
                            <div className="px-4 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b bg-muted/20">Solisti</div>
                          )}
                          <Table>
                            <TableHeader><TableRow><TableHead>Nominativo</TableHead><TableHead>Orario</TableHead><TableHead>Attività</TableHead><TableHead>Luogo</TableHead><TableHead>Note</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
                            <TableBody>{entries.map((e) => entryRow(e, false))}</TableBody>
                          </Table>
                        </>
                      )}
                      {extrasEntries.length > 0 && (
                        <>
                          <div className="px-4 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-t border-b bg-muted/20">Extras</div>
                          <Table>
                            <TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Orario</TableHead><TableHead>Attività</TableHead><TableHead>Luogo</TableHead><TableHead>Note</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
                            <TableBody>{extrasEntries.map((e) => entryRow(e, true))}</TableBody>
                          </Table>
                        </>
                      )}
                      {linked.map((ld) => {
                        const ldEntries = entriesByDept[ld.value] ?? [];
                        if (!ldEntries.length) return null;
                        return (
                          <React.Fragment key={ld.value}>
                            <div className="px-4 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-t border-b bg-muted/20">{ld.label}</div>
                            <Table>
                              <TableHeader><TableRow><TableHead>Nominativo</TableHead><TableHead>Orario</TableHead><TableHead>Attività</TableHead><TableHead>Luogo</TableHead><TableHead>Note</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
                              <TableBody>{ldEntries.map((e) => entryRow(e, false))}</TableBody>
                            </Table>
                          </React.Fragment>
                        );
                      })}
                    </Card>
                  );
                })}
              </div>
```

Sostituire con (rendering per `entryGroups`, una card per luogo, tabella senza colonna "Luogo", `isExtras` calcolato dal department):

```tsx
              <div className="space-y-3">
                {entryGroups.map((group) => (
                  <Card key={group.locationId ?? "__no_location__"} className="overflow-hidden">
                    <div className="px-4 py-2 text-sm font-semibold flex items-center gap-1.5">
                      <MapPin size={13} className="text-muted-foreground" />
                      {group.locationName}
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nominativo</TableHead>
                          <TableHead>Orario</TableHead>
                          <TableHead>Attività</TableHead>
                          <TableHead>Note</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.entries.map((e) => entryRow(e, e.member.department === "CAST_EXTRAS"))}
                      </TableBody>
                    </Table>
                  </Card>
                ))}
              </div>
```

- [ ] **Step 5: Lanciare il typecheck/build per verificare la correttezza dei tipi**

Run: `npm run build`
Expected: build completa senza errori TypeScript. Se ci sono warning ESLint pre-esistenti non correlati, ignorarli; deve risolvere eventuali errori introdotti dalle modifiche (es. `entriesByDept is not defined`, `linkedByParent is not used`).

NOTE: se `linkedByParent` (riga 56-59) resta dichiarato ma non più usato in questa sezione, verificare con grep se è usato altrove nel file. Se non lo è, lasciarlo comunque — è una variabile derivata da `departments` che potrebbe servire ad altri renderer futuri; ESLint sull'app non blocca su `no-unused-vars` per derived values locali. Solo se la build fallisce esplicitamente per `linkedByParent` non usato, rimuoverlo.

- [ ] **Step 6: Lanciare i test esistenti per verificare nessuna regressione**

Run: `npm test`
Expected: tutti i test passano (inclusi i 10 nuovi di `entry-grouping.test.ts`).

- [ ] **Step 7: Commit**

```bash
git add src/app/productions/[id]/odg/[odgId]/page.tsx
git commit -m "feat(odg): group chiamate individuali by location instead of department"
```

---

## Task 3: Verifica manuale nel browser

**Files:** Nessuna modifica al codice. Solo verifica funzionale dal vivo, come da AGENTS.md / convenzioni del progetto sull'interaction testing.

- [ ] **Step 1: Avviare il dev server**

Run: `npm run dev`
Expected: server pronto su `http://localhost:3000` (o porta successiva libera).

- [ ] **Step 2: Aprire un ODG con chiamate distribuite su più luoghi e reparti**

Aprire il browser su `http://localhost:3000`, navigare a una produzione esistente con almeno 1 ODG. Se nessun ODG soddisfa le condizioni, crearne uno aggiungendo:
- 1 sessione "Prova musicale" in **Palcoscenico**
- 1 sessione "Prova" in **Sala Prova** (o altra location)
- 3-4 chiamate individuali distribuite tra i due luoghi, su almeno 2 reparti diversi (es. CAST + ORCHESTRA + CORO)
- 1 chiamata senza luogo

- [ ] **Step 3: Verificare visivamente il raggruppamento**

Controllare nella colonna destra "Chiamate individuali":
- ☐ C'è una card per ogni luogo presente nelle chiamate
- ☐ L'header di ogni card mostra il nome del luogo (con icona `MapPin`)
- ☐ La card "Senza luogo" (se presente) appare per ultima
- ☐ Le card sono ordinate per orario della chiamata più precoce di ciascun gruppo
- ☐ Dentro ogni card, le chiamate sono ordinate per orario di inizio crescente
- ☐ Ogni riga ha lo sfondo tinto col colore del proprio reparto
- ☐ La colonna "Luogo" non è più presente (l'informazione è nell'header)

- [ ] **Step 4: Verificare che le interazioni funzionino**

- ☐ Click su "Aggiungi chiamata" apre il form; aggiungere una nuova chiamata e verificare che compaia nel gruppo del luogo corretto, ordinata per orario
- ☐ Click sull'icona matita di una chiamata apre l'edit in-place; modificare l'orario e salvare, verificare che la chiamata venga riordinata
- ☐ Cambiare il luogo di una chiamata in edit; salvare e verificare che cambi gruppo
- ☐ Click sull'icona cestino apre il ConfirmDialog; confermare e verificare la rimozione (e l'eventuale rimozione del gruppo se era l'unica chiamata)

- [ ] **Step 5: Verificare che le sezioni non toccate siano intatte**

- ☐ Colonna SINISTRA "Programma del giorno": invariata, ancora raggruppata per luogo
- ☐ Header della pagina (breadcrumb, status, note, eventi extra): invariato
- ☐ Bottoni PDF / Word: funzionanti (apri uno dei due e verifica che l'export non sia rotto — il contenuto resta nel formato precedente per i reparti, come previsto dallo spec)

- [ ] **Step 6: Fermare il dev server**

Premere `Ctrl+C` nel terminale del server.

- [ ] **Step 7: Se la verifica è OK, nessun ulteriore commit necessario**

Se durante la verifica emergono problemi, correggerli con commit aggiuntivi nel formato `fix(odg): <descrizione>`.
