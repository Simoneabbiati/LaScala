# Design — Auto-popolamento ODG per tipo di prova

**Data:** 2026-05-22
**Repo:** LaScala (Quinta — gestionale ODG per teatri lirici)
**Stato:** approvato in brainstorming, da implementare

## Obiettivo

Quando il direttore di scena aggiunge un blocco al programma del giorno (es. "10:00–11:30 Prova di Scena"), il sistema deve creare in automatico le entry individuali per tutte le figure professionali tipicamente richieste da quel tipo di prova (Regista, Maestro di Sala, cast, ecc.).

Se una figura richiesta non è ancora nel roster della produzione, il sistema crea uno "slot vuoto" — un `ProductionMember` con `personId = null` ma con `department` e `roleTitle` corretti, lasciando al direttore di scena il compito di assegnare il nome quando vuole.

L'obiettivo finale: ridurre drasticamente i click ripetitivi per costruire un ODG e prevenire dimenticanze (figure obbligatorie mai convocate per distrazione).

## Decisioni di scope

| Decisione | Scelta |
|-----------|--------|
| Trigger dell'auto-popolamento | Creazione di un `OdgSession` (blocco del programma) |
| Granularità del mapping | Mix: ruolo specifico O dipartimento intero O "tutti" |
| Figura mancante nel roster | Crea slot vuoto (`personId = null`) + entry + toast |
| Storage del mapping | Hardcoded in `src/lib/activity-presets.ts` |
| Required vs Optional | Aggiungi tutto, il toast distingue, l'utente cancella |
| Lista attività | Sostituita: clean slate con le 24 voci del PDF di riferimento |

Esplicitamente **fuori scope**:
- UI per modificare i preset (sono in codice; modificarli = PR)
- Override per singolo teatro (solo default globale)
- Tracking "questa entry è stata auto-creata da preset" (nessun campo extra in DB)
- Propagazione automatica dei cambiamenti della session alle entries (es. cambio orario session non si propaga alle entries — restano indipendenti dopo la creazione)
- Auto-rimozione delle entries se si cambia l'activity della session

## Forma del preset

Nuovo file `src/lib/activity-presets.ts`:

```ts
export type PresetFigure =
  | { kind: "role"; department: string; roleTitle: string; required: boolean }
  | { kind: "dept"; department: string;                    required: boolean }
  | { kind: "all";                                          required: boolean };

export const ACTIVITY_PRESETS: Record<string, PresetFigure[]> = {
  // Esempio "Prova di Scena"
  "Prova di Scena": [
    { kind: "role", department: "TEAM_CREATIVO",   roleTitle: "Regista",                required: true },
    { kind: "role", department: "TEAM_CREATIVO",   roleTitle: "Assistente alla Regia",  required: true },
    { kind: "dept", department: "CAST",                                                  required: true },
    { kind: "dept", department: "MAESTRO_DI_SALA",                                       required: true },
    { kind: "dept", department: "MAESTRI_DI_PALCOSCENICO",                               required: true },
  ],
  // ... 23 altre attività dal PDF
};
```

### Semantica delle tre forme

- **`kind: "role"`** — cerca un `ProductionMember` con `department = X` AND `roleTitle = Y` esatti. Se non esiste, crea uno slot vuoto. Usato per i ruoli "liberi" interni a `TEAM_CREATIVO` (Regista, Direttore d'Orchestra, Costumista, Scenografo, Lighting Designer, Video Designer) e a `CAST_EXTRAS` (Comparse, Mimi, Mime).

- **`kind: "dept"`** — coinvolge tutti i `ProductionMember` esistenti di quel dipartimento. Se il dipartimento è completamente vuoto nel roster, crea **un** slot vuoto generico per quel dept (es. `roleTitle = "Maestro di Sala"`). Usato per i dipartimenti già granulari (MAESTRO_DI_SALA, MACCHINISTI, ORCHESTRA, ARTISTI_CORO_UOMINI, ecc.) e per i due "macro-dipartimenti" (CAST, CAST_EXTRAS).

- **`kind: "all"`** — coinvolge tutti i `ProductionMember` della produzione, qualunque dipartimento. Usato per le 7 attività "Tutti i reparti artistici e tecnici" (PROVA D'INSIEME, ANTEGENERALE, GENERALE, le 3 RAPPRESENTAZIONI, PROVA D'INSIEME IN COSTUME). Non crea mai slot vuoti — se il roster è vuoto, non aggiunge nulla.

### Interazione con `linkedToDept`

Il meccanismo esistente in [`src/app/api/odg/[id]/entries/route.ts`](../../../src/app/api/odg/%5Bid%5D/entries/route.ts) auto-crea entries per i dipartimenti collegati (es. quando aggiungi `ARTISTI_CORO_UOMINI` viene auto-aggiunto `MAESTRO_CORO_UOMINI`). I preset **non duplicano** questa logica: nei preset di PROVA ITALIANA elenchiamo solo "Coro Uomini", "Coro Donne", "Coro Voci Bianche" — i maestri vengono giù dalla logica `linkedToDept` esistente. Stesso ragionamento per qualunque futuro dipartimento collegato.

## Lista delle 24 attività (sostituisce `ACTIVITIES` corrente)

Mantengo i nomi del PDF, normalizzando capitalizzazione/apostrofi:

1. Prova di Scena
2. Prova Musicale
3. Prova Italiana
4. Antepiano
5. Prova d'Insieme
6. Prova Tecnica
7. Prova Luci
8. Prova Luci e Video
9. Prova Costume
10. Prova Trucco e Parrucco
11. Prova Riepilogativa
12. Assestamento *(nota: PDF scrive "ASSENSTAMENTO" — refuso, normalizzo a "Assestamento")*
13. 1ª Rappresentazione
14. 2ª Rappresentazione
15. 3ª Rappresentazione
16. A Disposizione della Tecnica
17. A Disposizione della Tecnica e delle Luci
18. Conferenza Stampa
19. Montaggio
20. Antegenerale
21. Generale
22. Prova d'Insieme in Costume
23. Prova di Scena in Costume
24. Accordatura Cembalo

ODG già esistenti con valori vecchi (es. "Sitzprobe", "Filata") restano leggibili — il campo `OdgEntry.activity` è una stringa libera, non un FK. Semplicemente non saranno più selezionabili da menu.

## Comportamento server

### Endpoint modificato: `POST /api/odg/[id]/sessions`

Diventa atomico (transazione Prisma unica):

```
1. Crea l'OdgSession con i dati ricevuti (come oggi).
2. Leggi ACTIVITY_PRESETS[session.activity].
   Se non esiste o è vuoto → return solo con session, no createdMembers/Entries.
3. Per ogni PresetFigure nel preset:
   a. kind = "all":
        fetch tutti i ProductionMember della produzione.
   b. kind = "dept":
        fetch ProductionMember con dept = X.
        Se zero risultati → CREA un ProductionMember con
            { productionId, department: X, roleTitle: Department.label, personId: null }
        usando come roleTitle il `label` dalla tabella Department (es. "Maestro di Sala"
        per dept "MAESTRO_DI_SALA"). Aggiungilo al set.
   c. kind = "role":
        fetch ProductionMember con dept = X AND roleTitle = Y.
        Se non esiste → CREA un ProductionMember con
            { productionId, department: X, roleTitle: Y, personId: null }
        e aggiungilo al set.
4. Dedup contro OdgEntry esistenti: scarta i memberId che hanno già
   un'OdgEntry su questo odgId con la stessa (startTime, endTime, activity).
   Evita doppioni se l'utente ricrea lo stesso blocco o se entry manuali
   precedenti coincidono.
5. Crea tutte le OdgEntry mancanti in batch (createMany), copiando
   startTime / endTime / activity / locationId dalla session, e calcolando
   sortOrder = currentEntryCount + i. Per ogni entry, `characterName` segue la
   stessa logica del POST /entries esistente: eredita `member.characterName`
   se presente (utile per i solisti CAST con personaggio assegnato), altrimenti null.
6. La createMany scatena, per ogni entry, la logica linkedToDept già
   esistente per le entries (nota: oggi linkedToDept è dentro POST /entries —
   va estratto in una funzione helper riusabile e chiamato da entrambi i path).
7. Tutto in prisma.$transaction([...]) — se uno step fallisce, rollback.
8. Restituisci:
   {
     session,
     createdMembers: [ { id, department, roleTitle }, ... ],
     createdEntries: [ { id, memberId, roleTitle, required }, ... ],
   }
```

### Helper da estrarre

La logica `linkedToDept` attualmente vive inline in [`POST /api/odg/[id]/entries`](../../../src/app/api/odg/%5Bid%5D/entries/route.ts) (righe 32–72). Va estratta in `src/lib/odg-linked-depts.ts` come funzione pura che prende `(prisma, odgId, members[], sessionData)` e crea le entries linked. Sia il POST /entries che il nuovo POST /sessions la chiamano.

## UI / Toast

Il client riceve `createdMembers` e `createdEntries`, compone un toast a partire da quello.

**Messaggi (template, in italiano, tono professionale):**

- **Caso normale** (`createdMembers` vuoto):
  > *Aggiunte N figure alla prova "{activity}".*

- **Con slot vuoti creati nel roster:**
  > *Aggiunte N figure alla prova "{activity}".*
  > *Visto che non erano nel roster, ho creato anche queste posizioni (da assegnare): **{lista ruoli separati da virgola}**. Puoi compilare i nomi dalla sezione Roster quando vuoi.*

- **Con figure opzionali:**
  > *Aggiunte N figure alla prova "{activity}" (R richieste + O opzionali).*
  > *Opzionali: **{lista}** — rimuovile se non servono.*

- **Combo (slot creati + opzionali):**
  > Combina i due messaggi sopra in due righe.

**Toast infrastructure:** l'app attualmente non ha un sistema toast (verificato: nessuna dipendenza tipo Sonner/react-hot-toast in `package.json`). Va aggiunta una libreria minima — proposta: **Sonner** (leggera, drop-in con shadcn/ui che già usiamo). In alternativa, un banner inline non-modale dentro la pagina ODG appena sopra la tabella delle entries, che si auto-dismisses dopo ~8s. Decisione tattica da prendere all'inizio dell'implementazione.

## Edge case

| Caso | Comportamento |
|------|---------------|
| Activity senza preset | Session creata, zero entries auto, nessun toast extra |
| Roster già completo | Zero `createdMembers`, toast solo sulle entries |
| Stessa session ricreata (clone) | Dedup filtra duplicati su `(memberId, startTime, endTime, activity)` |
| Entry auto rimossa manualmente, poi session ricreata | Entry viene ri-aggiunta (comportamento atteso) |
| PATCH della session (cambio orario) | NON propaga alle entries — restano col vecchio orario, utente edita a mano |
| Cambio activity della session | NON ripopola con nuovo preset — utente cancella entries manualmente |
| Location della session = null | Anche le entries ereditano `locationId = null` |
| Activity in `ACTIVITY_PRESETS` con `kind: "all"` e roster vuoto | Zero entries create, nessun slot vuoto generato |

## Testing

Test unitari (con file SQLite in memoria o test DB temporaneo):

1. **Happy path con roster completo** — POST sessions con activity="Prova di Scena", roster ha già Regista + Maestro di Sala + 3 solisti → 5 entries, 0 createdMembers.
2. **Slot vuoti creati** — roster vuoto, POST sessions activity="Prova di Scena" → 5 createdMembers con personId=null, 5 entries.
3. **kind: "all"** — roster con 10 membri vari, activity="Generale" → 10 entries, 0 createdMembers.
4. **kind: "all" roster vuoto** — 0 entries, 0 createdMembers, session comunque creata.
5. **Dedup** — entry già esistente per Regista 10-12, POST session "Prova di Scena" 10-12 → entry Regista NON duplicata.
6. **Activity senza preset** — POST sessions activity="ActivityCustom" → session creata, 0 entries, 0 createdMembers.
7. **Atomicità** — simulando un errore nello step 5 (createMany), nessuna `OdgSession` né `ProductionMember` rimane in DB.
8. **linkedToDept ancora funziona** — POST session "Prova Italiana" che ha "Artisti Coro Uomini" nel preset → Maestro del Coro Uomini auto-aggiunto via linkedToDept esistente.

Test E2E manuale (golden path):
- Apri ODG vuoto
- Crea blocco "Prova di Scena" 10:00–12:00
- Verifica: toast mostra figure aggiunte
- Verifica: nella tabella entries appaiono le righe
- Vai nel roster: vedi gli slot vuoti con dicitura "Da assegnare"

## File toccati (preview)

| File | Tipo |
|------|------|
| `src/lib/activity-presets.ts` | NUOVO — definizione del mapping |
| `src/lib/odg-linked-depts.ts` | NUOVO — helper estratto da entries/route |
| `src/lib/constants.ts` | MODIFICA — `ACTIVITIES` sostituito |
| `src/app/api/odg/[id]/sessions/route.ts` | MODIFICA — logica auto-popolamento |
| `src/app/api/odg/[id]/entries/route.ts` | REFACTOR — usa helper per linkedToDept |
| `src/app/productions/[id]/odg/[odgId]/page.tsx` | MODIFICA — leggi response, mostra toast |
| Toast/banner system | NUOVO — vedi sezione "Toast infrastructure" sopra |
| Tests | NUOVO file di test per il nuovo flusso |

## Schema migration

**Nessuna migration necessaria.** Tutti i campi richiesti esistono già (`personId nullable`, `OdgEntry.activity` come stringa, ecc.).
