# ODG — Attività "Personalizza" nel form "Aggiungi blocco"

## Problema

Nel form "Aggiungi blocco" della pagina ODG ([src/app/productions/[id]/odg/[odgId]/page.tsx](../../../src/app/productions/%5Bid%5D/odg/%5BodgId%5D/page.tsx)), il tipo di attività è scelto da un `<select>` popolato con la lista chiusa `ACTIVITIES` ([src/lib/constants.ts](../../../src/lib/constants.ts)). Se l'utente deve registrare un tipo di prova non previsto (es. una prova ad-hoc richiesta dal regista), oggi non ha modo di farlo dall'interfaccia.

## Obiettivo

Permettere all'utente di inserire un nome di attività libero direttamente dal form "Aggiungi blocco", senza modificare la lista canonica `ACTIVITIES` e senza introdurre un flusso separato.

## Ambito

- **Incluso**: form "Aggiungi blocco" (`addSession` / `showSessionForm`) nella pagina ODG.
- **Escluso**:
  - Form di modifica di un blocco esistente (`editSession`) — invariato.
  - Auto-popolamento di voci a partire dal nome custom (le attività personalizzate non hanno preset in `ACTIVITY_PRESETS`; nessuna voce viene aggiunta automaticamente).
  - Persistenza della lista delle attività personalizzate fra ODG o fra produzioni.

## Design

### 1. UI

Nel `<select>` "Tipo di attività" del form "Aggiungi blocco" (intorno a [page.tsx:493](../../../src/app/productions/%5Bid%5D/odg/%5BodgId%5D/page.tsx#L493)), aggiungere un'opzione finale:

```tsx
<option value="__custom__">Personalizza…</option>
```

Quando il valore selezionato è `__custom__`, sotto al `<select>` compare un campo aggiuntivo:

```tsx
<FormField label="Nome attività">
  <Input
    autoFocus
    required
    type="text"
    placeholder="Nome attività personalizzata"
    value={sessionForm.customActivity}
    onChange={(e) => setSessionForm({ ...sessionForm, customActivity: e.target.value })}
    className="h-8 text-sm"
  />
</FormField>
```

Se l'utente torna a una voce della lista, l'input scompare e `customActivity` torna a stringa vuota.

L'opzione `Personalizza…` **non** appare nel `<select>` del form di modifica (`editSession`) — l'`<option>` extra è inserita solo nel form "Aggiungi blocco".

### 2. Stato

`sessionForm` (state locale della pagina) viene esteso con un campo:

```ts
{
  activity: string;       // valore del <select>: una voce di ACTIVITIES, "" iniziale, o "__custom__"
  customActivity: string; // testo libero, valorizzato solo se activity === "__custom__"
  startTime: string;
  endTime: string;
  locationId: string;
}
```

Il reset del form (dopo submit riuscito o annulla) riporta sia `activity` sia `customActivity` a `""`.

### 3. Submit

`addSession` calcola il valore effettivo di `activity` da inviare all'API:

```ts
const activityToSend =
  sessionForm.activity === "__custom__"
    ? sessionForm.customActivity.trim()
    : sessionForm.activity;
```

Se `activityToSend` è una stringa vuota, il submit non procede (l'attributo `required` sull'`<input>` copre il caso primario; aggiungere comunque un guard difensivo prima della `fetch`).

Il body inviato a `POST /api/odg/[id]/sessions` resta `{ activity: activityToSend, startTime, endTime, locationId, sortOrder }`.

### 4. Backend

**Nessuna modifica.** L'handler in [src/app/api/odg/[id]/sessions/route.ts](../../../src/app/api/odg/%5Bid%5D/sessions/route.ts) accetta già `body.activity` come stringa libera. Il guard alla riga 28 (`if (!preset || preset.length === 0) return …`) gestisce naturalmente il caso "nessun preset per questa attività": il blocco viene creato senza auto-popolamento di membri/voci.

Il campo `activity` resta `String` in Prisma sia per `OdgSession` sia per `OdgEntry` ([prisma/schema.prisma:107,122](../../../prisma/schema.prisma)).

### 5. Costanti

`ACTIVITIES` in `src/lib/constants.ts` **resta invariato**. Il valore `"__custom__"` è un sentinella di UI interno al form e non viene mai salvato (al submit viene sempre rimpiazzato dal testo dell'input).

## Test

Il file [page.tsx](../../../src/app/productions/%5Bid%5D/odg/%5BodgId%5D/page.tsx) è un componente client e il progetto non ha infrastruttura di test React (i test in `tests/lib/` coprono solo helper puri). Quindi:

- **Nessun nuovo test automatico.**
- **Verifica manuale** documentata nel PR:
  1. Aprire un ODG, cliccare "Aggiungi blocco".
  2. Selezionare `Personalizza…` dal dropdown.
  3. L'input "Nome attività personalizzata" compare con focus.
  4. Scrivere un nome libero (es. "Prova ad-hoc"), compilare orari, salvare.
  5. Il nuovo blocco appare nella lista con l'`activity` custom, senza voci auto-popolate.
  6. Tornare al form, scegliere `Personalizza…`, poi tornare su una voce della lista: l'input scompare.
  7. Provare a salvare con `Personalizza…` selezionato e input vuoto: il browser blocca il submit (`required`).

## Rischi e mitigazioni

- **Sentinella `__custom__` collide con un'attività futura**: improbabile (il valore inizia con doppio underscore e non è un nome italiano plausibile). Mitigazione: lasciare l'identificatore così com'è; se in futuro `ACTIVITIES` includesse una stringa simile, il test sull'uguaglianza fallirà in modo evidente.
- **Reset incompleto del form**: se `customActivity` non viene resettato insieme a `activity`, alla riapertura del form potrebbe restare valorizzato. Mitigato includendo esplicitamente `customActivity: ""` in ogni reset.
- **Attività custom non rientra in alcun preset**: comportamento atteso e documentato — l'utente sceglie esplicitamente di personalizzare, quindi compilerà le voci a mano.

## File toccati

- [src/app/productions/[id]/odg/[odgId]/page.tsx](../../../src/app/productions/%5Bid%5D/odg/%5BodgId%5D/page.tsx) — unico file modificato.
