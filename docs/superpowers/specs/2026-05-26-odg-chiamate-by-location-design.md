# Design — Chiamate individuali ODG raggruppate per luogo

**Data:** 2026-05-26
**Repo:** LaScala (Quinta — gestionale ODG per teatri lirici)
**Stato:** approvato in brainstorming, da implementare

## Obiettivo

Nella pagina di compilazione dell'ODG (`/productions/[id]/odg/[odgId]`), la sezione **Chiamate individuali** (colonna destra) attualmente raggruppa le prestazioni per dipartimento (Compagnia, Orchestra, Coro, …). Questo mescola visivamente prestazioni che avvengono in luoghi diversi sotto lo stesso reparto, rendendo difficile capire chi sta dove a colpo d'occhio.

Il nuovo design raggruppa le chiamate per **luogo** (sala), con ordinamento interno per **orario di inizio crescente**. Il reparto resta identificabile tramite una tinta di sfondo sulla riga.

## Decisioni di scope

| Decisione | Scelta |
|-----------|--------|
| Sezione modificata | "Chiamate individuali" (colonna destra) di [page.tsx](../../../src/app/productions/[id]/odg/[odgId]/page.tsx) |
| Struttura | Piatta: una card per luogo, dentro un'unica tabella di chiamate |
| Ordinamento gruppi | Per orario di inizio della prima chiamata del gruppo (asc); "Senza luogo" sempre in fondo |
| Ordinamento interno | `startTime asc`, poi `endTime asc`, poi `member.person.name` (tiebreaker stabile) |
| Chiamate senza luogo | Raccolte in una card finale etichettata "Senza luogo" |
| Distinzione reparto sulla riga | Tinta di sfondo usando la mappa esistente `deptBg` |
| Sede della logica | Solo client-side, dentro il componente React |
| API / DB | Nessuna modifica |
| PDF / Word export | Nessuna modifica |
| Sezione SINISTRA "Programma del giorno" | Nessuna modifica (già raggruppata per luogo) |

Esplicitamente **fuori scope**:
- Cambi al GET `/api/odg/[id]` (ordinamento per location.name lato Prisma)
- Replica del raggruppamento per luogo nel PDF e nel Word export
- Cambi al form "Aggiungi chiamata" / edit in place / delete
- Rendere `locationId` obbligatorio sul modello `OdgEntry`
- Sub-raggruppamento per dipartimento o per attività all'interno di un luogo
- Riordino drag-and-drop delle chiamate

## Modello dati

Nessuna modifica al modello Prisma. Si riusano:

- `OdgEntry { id, startTime, endTime, activity, locationId?, notes?, sortOrder, member, location }` ([schema.prisma:108-122](../../../prisma/schema.prisma#L108-L122))
- `Location { id, name, theatreId }` ([schema.prisma:20-27](../../../prisma/schema.prisma#L20-L27))
- `ProductionMember.department` (stringa) — usato per indicizzare `deptBg`

## Logica di raggruppamento

Sostituisce il blocco `entriesByDept` ([page.tsx:267-274](../../../src/app/productions/[id]/odg/[odgId]/page.tsx#L267-L274)) e il render dei dipartimenti ([page.tsx:697-749](../../../src/app/productions/[id]/odg/[odgId]/page.tsx#L697-L749)).

### Pseudocodice

```ts
type EntryGroup = {
  locationId: string | null;
  locationName: string;       // "Senza luogo" se locationId è null
  entries: OdgEntry[];        // già ordinate
  firstStart: string | null;  // null solo se entries è vuoto, ma non capita
};

function groupEntriesByLocation(entries: OdgEntry[]): EntryGroup[] {
  const byLoc = new Map<string | null, OdgEntry[]>();
  for (const e of entries) {
    const key = e.location?.id ?? null;
    if (!byLoc.has(key)) byLoc.set(key, []);
    byLoc.get(key)!.push(e);
  }

  const groups: EntryGroup[] = [];
  for (const [locId, list] of byLoc) {
    list.sort((a, b) =>
      a.startTime.localeCompare(b.startTime) ||
      a.endTime.localeCompare(b.endTime) ||
      (a.member.person?.name ?? a.member.roleTitle).localeCompare(
        b.member.person?.name ?? b.member.roleTitle
      )
    );
    groups.push({
      locationId: locId,
      locationName: list[0].location?.name ?? "Senza luogo",
      entries: list,
      firstStart: list[0].startTime,
    });
  }

  // "Senza luogo" sempre in fondo; gli altri per firstStart asc
  groups.sort((a, b) => {
    if (a.locationId === null) return 1;
    if (b.locationId === null) return -1;
    return (a.firstStart ?? "").localeCompare(b.firstStart ?? "");
  });

  return groups;
}
```

### Render

Ogni `EntryGroup` diventa una `<Card>` con:

- Header: `locationName` (testo, stesso stile del precedente header dipartimento ma senza tinta di sfondo)
- Tabella con colonne: **Nominativo · Orario · Attività · Note · (azioni)**
  - La colonna "Luogo" viene rimossa (ridondante con l'header)
- Ogni `<TableRow>` riceve `style={{ backgroundColor: deptBg[entry.member.department] ?? undefined }}`
  - Per `CAST_EXTRAS`, se `deptBg["CAST_EXTRAS"]` non esiste, fallback a `deptBg["CAST"]`

## Componenti UI

File toccato: solo [src/app/productions/[id]/odg/[odgId]/page.tsx](../../../src/app/productions/[id]/odg/[odgId]/page.tsx).

Modifiche puntuali:

1. **Rimuovere** `entryCustomDepts`, `fullDeptOrder` (riempimento), `entriesByDept` se non più usati altrove nel render (verificare che `fullDeptOrder` resti per il `select` del form "Persona" alle righe 640-658 — sì, resta).
2. **Aggiungere** funzione `groupEntriesByLocation` (o inline `useMemo`) e calcolo di `entryGroups`.
3. **Sostituire** il blocco `{fullDeptOrder.map(...)}` di rendering chiamate ([page.tsx:697-749](../../../src/app/productions/[id]/odg/[odgId]/page.tsx#L697-L749)) con `{entryGroups.map(...)}`.
4. **Aggiornare** `entryRow` ([page.tsx:290-366](../../../src/app/productions/[id]/odg/[odgId]/page.tsx#L290-L366)):
   - Rimuovere la `<TableCell>` "Luogo" (riga 350), e la colonna corrispondente nell'`<TableHeader>` (riga 719, 728, 740)
   - Applicare `backgroundColor` alla `<TableRow>` non-editing (riga 322)
5. **Rimuovere** la logica `linked / linkedEntries / showSolistiHeader / extrasEntries` nel render principale: non serve più con il raggruppamento per luogo. La distinzione Solisti vs Extras sparisce dall'UI di questa sezione (resta visibile via colore + dati colonna).

## Edge cases

| Caso | Comportamento |
|------|---------------|
| Nessuna chiamata | Mostra il messaggio attuale "Nessuna chiamata ancora." Nessun gruppo renderizzato. |
| Tutte le chiamate senza luogo | Una sola card "Senza luogo" |
| Più chiamate nello stesso luogo con stesso `startTime` | Ordinate per `endTime`, poi per nome — ordine deterministico |
| Chiamata con `member.person == null` (es. Coro, sezione, ruolo non assegnato) | Usa `member.roleTitle` come chiave di ordinamento e per il display (già gestito da `entryRow`) |
| Dipartimento non in `deptBg` | Nessuna tinta di sfondo (riga grigia/bianca di default) |
| `Location` cancellato dopo che la chiamata è stata creata | `entry.location` è `null` → finisce nel gruppo "Senza luogo" |

## Test

Aggiungere un unit test isolato per `groupEntriesByLocation` in `tests/lib/`:

- Raggruppamento corretto per `locationId`
- Ordinamento interno per `startTime` asc con tiebreaker su `endTime` e nome
- Gruppo "Senza luogo" sempre in fondo, anche se `firstStart` è precoce
- Gruppi non-null ordinati per `firstStart` asc
- Comportamento con array vuoto → `[]`

Non sono previsti test E2E o di snapshot UI: la modifica visiva sarà verificata manualmente nel browser secondo le linee guida del progetto (vedere AGENTS.md).

## Verifica manuale

Prima di considerare il task completo:

1. Avviare il dev server
2. Aprire un ODG con chiamate distribuite su almeno 2 luoghi e almeno 2 dipartimenti diversi
3. Verificare:
   - Le card sono raggruppate per luogo
   - Le chiamate di ciascun luogo sono ordinate dall'orario più precoce
   - Il colore della riga corrisponde al dipartimento
   - "Senza luogo" appare in fondo solo se ci sono chiamate senza luogo
   - Form "Aggiungi chiamata", edit-in-place e delete continuano a funzionare
