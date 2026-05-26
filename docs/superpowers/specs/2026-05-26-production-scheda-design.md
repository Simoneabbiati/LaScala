# Design — Scheda opera per produzione

**Data:** 2026-05-26
**Repo:** LaScala (Quinta — gestionale ODG per teatri lirici)
**Stato:** approvato in brainstorming, da implementare

## Obiettivo

Per ogni produzione, fornire una "scheda opera" che riunisce in una sola pagina i dati anagrafici dell'opera (compositore, titolo, personaggi — già presenti in DB) e una serie di campi editoriali specifici della messa in scena di quel teatro: trama, divisione in atti, ruoli del coro, locazioni interne, hazards (armi/effetti speciali) e note da ricordare.

La scheda è di livello **Production** (non Opera): i campi descrivono l'allestimento di quel teatro, non l'opera in astratto. Una stessa "Tosca" rappresentata in due stagioni diverse ha due schede distinte.

## Decisioni di scope

| Decisione | Scelta |
|-----------|--------|
| Livello del dato | Production (per-allestimento), non Opera (universale) |
| Significato di "Interni" | Locazioni interne delle scene (es. "Sagrestia", "Studio di Cavaradossi") |
| Forma di "Divisione in atti" | Lista strutturata di `{title, description}` |
| Forma di Ruoli coro/Interni/Hazards | Liste di stringhe semplici |
| Forma di Trama/Note | Textarea libere |
| UX | Pagina dedicata `/productions/[id]/scheda` |
| Compilazione in `New Production` | Fuori scope — scheda solo post-creazione |
| Storage delle liste | Tabelle relazionali figlie (no JSON) |

Esplicitamente **fuori scope**:
- Campi della scheda dentro il form di creazione produzione
- Versionamento o storico modifiche della scheda
- Condivisione/template della scheda tra produzioni (es. importare la scheda di una vecchia Tosca)
- Allegati/immagini (bozzetti, foto di scena)
- Permessi differenziati per la compilazione

## Modello dati

### Estensione di `Production`

Si aggiungono due colonne opzionali:

```prisma
model Production {
  // ...campi esistenti
  plot          String?                 // trama (testo libero)
  schedaNotes   String?                 // note da ricordare (testo libero)
  acts          ProductionAct[]
  chorusRoles   ProductionChorusRole[]
  interiors     ProductionInterior[]
  hazards       ProductionHazard[]
}
```

`schedaNotes` (non `notes`) per evitare collisione semantica con il campo `notes` esistente su `Odg` e `ProductionMember`.

### Tabelle figlie

Quattro tabelle 1:N, tutte cascade-on-delete da `Production`:

```prisma
model ProductionAct {
  id           String     @id @default(cuid())
  productionId String
  production   Production @relation(fields: [productionId], references: [id], onDelete: Cascade)
  title        String      // es. "Atto I"
  description  String?     // es. "Chiesa di Sant'Andrea della Valle"
  sortOrder    Int         @default(0)
}

model ProductionChorusRole {
  id           String     @id @default(cuid())
  productionId String
  production   Production @relation(fields: [productionId], references: [id], onDelete: Cascade)
  name         String
  sortOrder    Int        @default(0)
}

model ProductionInterior {
  id           String     @id @default(cuid())
  productionId String
  production   Production @relation(fields: [productionId], references: [id], onDelete: Cascade)
  name         String
  sortOrder    Int        @default(0)
}

model ProductionHazard {
  id           String     @id @default(cuid())
  productionId String
  production   Production @relation(fields: [productionId], references: [id], onDelete: Cascade)
  name         String
  sortOrder    Int        @default(0)
}
```

Le tre tabelle "stringa + sortOrder" condividono lo stesso shape ma restano distinte per chiarezza relazionale e per evitare un discriminator inutile.

### Migration

Una sola migration: `prisma/migrations/20260526xxxxxx_add_production_scheda/migration.sql`.

Contenuto:
- `ALTER TABLE Production ADD COLUMN plot TEXT;`
- `ALTER TABLE Production ADD COLUMN schedaNotes TEXT;`
- `CREATE TABLE` per le 4 nuove tabelle con FK su `Production(id) ON DELETE CASCADE`.
- Indici su `productionId` per tutte e quattro.

## API

Un'unica route handler in `src/app/api/productions/[id]/scheda/route.ts`.

### `GET /api/productions/[id]/scheda`

Risposta `200`:
```ts
{
  plot: string | null;
  schedaNotes: string | null;
  acts: { id: string; title: string; description: string | null }[];
  chorusRoles: { id: string; name: string }[];
  interiors: { id: string; name: string }[];
  hazards: { id: string; name: string }[];
}
```

Tutte le liste sono già ordinate per `sortOrder` ASC. Gli `id` servono al frontend solo per i `key` di React.

`404` se la `Production` non esiste.

### `PUT /api/productions/[id]/scheda`

Body atteso (validato con zod):
```ts
{
  plot: string | null;
  schedaNotes: string | null;
  acts: { title: string; description: string | null }[];
  chorusRoles: { name: string }[];
  interiors: { name: string }[];
  hazards: { name: string }[];
}
```

Implementazione: `prisma.$transaction([...])` con
1. `prisma.production.update({ where: { id }, data: { plot, schedaNotes } })`
2. `prisma.productionAct.deleteMany({ where: { productionId: id } })` + `createMany` con `sortOrder` derivato dall'indice dell'array
3. idem per `chorusRoles`, `interiors`, `hazards`

Replace-all è la strategia più semplice e adatta ai volumi (decine di voci max per produzione). Niente diff lato server.

Risposta: stesso shape di `GET` dopo la modifica.

`404` se la `Production` non esiste; `400` su validazione fallita.

### Validazione (zod)

In `src/lib/scheda.ts`:
- `plot`, `schedaNotes`: nullable, max 10.000 caratteri
- `acts[].title`: 1-200 char; `acts[].description`: nullable, max 1.000 char
- `chorusRoles[].name`, `interiors[].name`, `hazards[].name`: 1-200 char
- Max 50 elementi per ciascuna lista (limite difensivo, non realistico raggiungere)

Lo stesso schema è esportato e usato anche dal client per validazione coerente.

## UI

### Pagina dedicata `/productions/[id]/scheda`

File: `src/app/productions/[id]/scheda/page.tsx` (server component che fa fetch dati iniziali) + `SchedaForm.tsx` (client component con tutto lo stato locale).

Link di accesso: aggiungere un bottone/link "Scheda opera" nella pagina `/productions/[id]` esistente.

### Layout

Form unico, una `Card` per sezione, nell'ordine:

1. **Dati dall'opera** — read-only, in cima:
   - Titolo (`Production.title`)
   - Compositore (`Production.composer`)
   - Personaggi: lista derivata dai `ProductionMember` con `department === "CAST"` (mostra `roleTitle` e `characterName`)
   - Niente editing qui — questi dati si modificano già altrove
2. **Trama** — `Textarea` (`@/components/ui/textarea`)
3. **Divisione in atti** — lista editabile di righe `{title, description}`:
   - Pulsante "+ Aggiungi atto" in fondo
   - Per ogni riga: input titolo, textarea descrizione (small), pulsante rimuovi (icona X), frecce ↑/↓ per riordinare
4. **Ruoli del coro** — `<StringListEditor>` (vedi sotto)
5. **Interni** — `<StringListEditor>`
6. **Hazards (armi/effetti speciali)** — `<StringListEditor>`
7. **Note da ricordare** — `Textarea`

In fondo alla pagina: bottone "Salva scheda" in una barra sticky in basso (così resta sempre raggiungibile su pagine lunghe). On click → `PUT` di tutto, toast di conferma o errore. Bottone disabilitato mentre la chiamata è in corso.

### Componente riutilizzabile `<StringListEditor>`

`src/components/StringListEditor.tsx`:
```ts
interface Props {
  label: string;
  items: { id?: string; name: string }[];
  onChange: (items: { id?: string; name: string }[]) => void;
  placeholder?: string;
}
```

Render: lista di righe con `Input` + bottone rimuovi + frecce ↑/↓ + pulsante "+ Aggiungi" sotto. Usato per Ruoli coro, Interni, Hazards.

L'`id` è opzionale: presente per le voci provenienti dal server (key di React), assente per quelle appena create lato client.

### Stato del form

Lo stato vive interamente in `SchedaForm.tsx` come un singolo `useState` con la stessa shape della risposta `GET`. Submit fa `PUT` di tutto in una volta. Non c'è autosave: la modifica è esplicita.

## Errori ed edge cases

- **Production non trovata**: 404 dall'API; la pagina mostra "Produzione non trovata".
- **Liste vuote**: salvataggio cancella tutto e ricrea vuoto (corretto).
- **Concorrenza**: due tab in scrittura simultanea — vince l'ultimo `PUT`. Accettato: l'app è interna, single-user-per-produzione di fatto.
- **Validazione fallita**: 400 con dettagli dei campi, mostrati come errore inline nella sezione interessata.
- **Cancellazione di una `Production`**: `onDelete: Cascade` pulisce automaticamente le 4 tabelle figlie.

## Test

In `tests/`, seguendo i pattern esistenti:

- **API integration** (`tests/api/productions-scheda.test.ts`):
  - `GET` su produzione senza scheda → tutti i campi null/array vuoti
  - `PUT` con payload completo → round-trip identico via `GET`
  - `PUT` due volte con liste diverse → replace-all (no duplicati)
  - `PUT` payload non valido → 400
  - `GET`/`PUT` su productionId inesistente → 404
- **UI smoke** (`tests/components/SchedaForm.test.tsx`):
  - render con dati iniziali
  - aggiunta/rimozione/riordino di un atto e di una voce di lista
  - submit produce il payload atteso

## File toccati / creati

Nuovi:
- `prisma/migrations/20260526xxxxxx_add_production_scheda/migration.sql`
- `src/app/api/productions/[id]/scheda/route.ts`
- `src/app/productions/[id]/scheda/page.tsx`
- `src/app/productions/[id]/scheda/SchedaForm.tsx`
- `src/components/StringListEditor.tsx`
- `src/lib/scheda.ts` (zod schema)
- `tests/api/productions-scheda.test.ts`
- `tests/components/SchedaForm.test.tsx`

Modificati:
- `prisma/schema.prisma` (estensione Production + 4 nuovi modelli)
- `src/app/productions/[id]/page.tsx` (link "Scheda opera")
