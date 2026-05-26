# ODG — Attività "Personalizza" nel form "Aggiungi blocco"

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `Personalizza…` option to the activity `<select>` of the ODG "Aggiungi blocco" form so users can register activity types not present in the canonical `ACTIVITIES` list, by typing a free-form name into an inline text input.

**Architecture:** Single file change in [src/app/productions/[id]/odg/[odgId]/page.tsx](../../../src/app/productions/%5Bid%5D/odg/%5BodgId%5D/page.tsx). UI sentinel value `"__custom__"` in the form state toggles an extra `<Input>` for the custom name; on submit the trimmed input replaces the sentinel before the request body is sent. Backend (`POST /api/odg/[id]/sessions`) already accepts arbitrary strings and skips auto-population when no preset matches, so no API changes.

**Tech Stack:** Next.js (client component), React `useState`, existing shadcn `Input`/`FormField` primitives.

**Reference spec:** [docs/superpowers/specs/2026-05-26-odg-personalizza-activity-design.md](../specs/2026-05-26-odg-personalizza-activity-design.md)

---

## Pre-flight

The project has no React component testing infrastructure (`tests/lib/*` covers only pure helpers). Per spec, no new automated tests are added — verification is manual against `npm run dev`. TypeScript and lint must still pass.

Commands the plan will use:

- TypeScript check: `npm run typecheck` (or `npx tsc --noEmit` if no script — verify in package.json)
- Lint: `npm run lint`
- Dev server: `npm run dev`

---

## Task 1: Extend `sessionForm` state with `customActivity`

**Files:**
- Modify: `src/app/productions/[id]/odg/[odgId]/page.tsx:26` (the `emptySession` factory)

`emptySession()` is reused as the reset value after submit, so adding the field there gives free reset semantics.

- [ ] **Step 1.1: Inspect the current `emptySession` line**

Run: `grep -n "emptySession" src/app/productions/\[id\]/odg/\[odgId\]/page.tsx`

Expected output includes:

```
26:const emptySession = () => ({ startTime: "", endTime: "", activity: "", locationId: "" });
```

- [ ] **Step 1.2: Add the `customActivity` field**

Edit line 26 to:

```tsx
const emptySession = () => ({ startTime: "", endTime: "", activity: "", locationId: "", customActivity: "" });
```

- [ ] **Step 1.3: TypeScript check**

Run: `npm run typecheck` (fall back to `npx tsc --noEmit` if no script). Expected: passes with no new errors.

If new errors appear because `sessionForm` is used elsewhere with the old shape, they should be picked up — note their locations; subsequent tasks will address them. If only the touched site is affected, proceed.

- [ ] **Step 1.4: Commit**

```bash
git add src/app/productions/\[id\]/odg/\[odgId\]/page.tsx
git commit -m "refactor(odg): extend sessionForm shape with customActivity field"
```

---

## Task 2: Compute the outbound `activity` in `addSession` and reset on cancel

**Files:**
- Modify: `src/app/productions/[id]/odg/[odgId]/page.tsx:77-91` (`addSession` handler)
- Modify: `src/app/productions/[id]/odg/[odgId]/page.tsx:512` (Annulla button)

The submit handler currently sends `sessionForm` verbatim. When the user picked `Personalizza…`, the sentinel `"__custom__"` must be replaced by the trimmed custom name before the request fires. Empty trimmed name → abort the submit (defensive guard in addition to the `required` HTML attribute).

The Annulla button must also reset the form so a stale `customActivity` doesn't survive between openings.

- [ ] **Step 2.1: Replace the `addSession` handler body**

Locate the function at line 77:

```tsx
const addSession = async (e: React.SyntheticEvent) => {
  e.preventDefault();
  const activity = sessionForm.activity;
  const res = await fetch(`/api/odg/${odgId}/sessions`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...sessionForm, sortOrder: odg?.sessions.length ?? 0 }),
  });
  if (res.ok) {
    const data = await res.json();
    showSessionCreationToast(data, activity);
  }
  setSessionForm(emptySession());
  setShowSessionForm(false);
  load();
};
```

Replace it with:

```tsx
const addSession = async (e: React.SyntheticEvent) => {
  e.preventDefault();
  const activity =
    sessionForm.activity === "__custom__"
      ? sessionForm.customActivity.trim()
      : sessionForm.activity;
  if (!activity) return;
  const { customActivity: _ignored, ...rest } = sessionForm;
  const res = await fetch(`/api/odg/${odgId}/sessions`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...rest, activity, sortOrder: odg?.sessions.length ?? 0 }),
  });
  if (res.ok) {
    const data = await res.json();
    showSessionCreationToast(data, activity);
  }
  setSessionForm(emptySession());
  setShowSessionForm(false);
  load();
};
```

Notes:
- The `_ignored` destructure strips `customActivity` from the outbound JSON so the backend never receives the UI-only field.
- The `if (!activity) return;` guards against empty trimmed custom names (defense in depth — the `required` attribute on the input already prevents it in normal browsers).
- The activity passed to `showSessionCreationToast` is the resolved string (custom or canonical), so the toast headline reads correctly.

- [ ] **Step 2.2: Update the Annulla button to reset the form**

Locate the cancel button at line 512:

```tsx
<Button type="button" size="sm" variant="ghost" onClick={() => setShowSessionForm(false)}>Annulla</Button>
```

Replace with:

```tsx
<Button type="button" size="sm" variant="ghost" onClick={() => { setSessionForm(emptySession()); setShowSessionForm(false); }}>Annulla</Button>
```

- [ ] **Step 2.3: TypeScript check**

Run: `npm run typecheck`. Expected: passes.

- [ ] **Step 2.4: Lint**

Run: `npm run lint`. Expected: passes. The `_ignored` prefix should satisfy any unused-variable rule (the project uses ESLint — verify the underscore prefix is accepted; if not, switch to a non-destructure approach: build a copy without `customActivity` via `const rest = { ...sessionForm }; delete (rest as { customActivity?: string }).customActivity;`).

- [ ] **Step 2.5: Commit**

```bash
git add src/app/productions/\[id\]/odg/\[odgId\]/page.tsx
git commit -m "feat(odg): resolve custom activity name on submit, reset form on cancel"
```

---

## Task 3: Add the `Personalizza…` option and the conditional custom-name input

**Files:**
- Modify: `src/app/productions/[id]/odg/[odgId]/page.tsx:488-515` (the `showSessionForm` JSX)

This task changes only the **add-block** form. The edit-session form (around line 450) is intentionally untouched.

- [ ] **Step 3.1: Add the `Personalizza…` option to the activity select**

Locate the `<select>` inside the add-block form (around line 491):

```tsx
<FormField label="Tipo di attività">
  <select required value={sessionForm.activity} onChange={(e) => setSessionForm({ ...sessionForm, activity: e.target.value })} className="w-full border border-input rounded-md px-2 py-1.5 text-sm bg-background">
    <option value="">Seleziona attività…</option>
    {ACTIVITIES.map((a) => <option key={a} value={a}>{a}</option>)}
  </select>
</FormField>
```

Replace with:

```tsx
<FormField label="Tipo di attività">
  <select
    required
    value={sessionForm.activity}
    onChange={(e) => setSessionForm({ ...sessionForm, activity: e.target.value, customActivity: e.target.value === "__custom__" ? sessionForm.customActivity : "" })}
    className="w-full border border-input rounded-md px-2 py-1.5 text-sm bg-background"
  >
    <option value="">Seleziona attività…</option>
    {ACTIVITIES.map((a) => <option key={a} value={a}>{a}</option>)}
    <option value="__custom__">Personalizza…</option>
  </select>
</FormField>
{sessionForm.activity === "__custom__" && (
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
)}
```

Notes:
- The `onChange` of the `<select>` clears `customActivity` whenever the user picks a non-custom value, so switching back to a preset doesn't leak stale text into a later submit.
- The conditional `<FormField>` is rendered as a sibling of the activity field (still inside the `<form>` that begins around line 489 and ends at line 515) — i.e. it lives between the activity `<FormField>` and the time-fields `<div className="grid grid-cols-2 gap-2">` that follows.

- [ ] **Step 3.2: TypeScript check**

Run: `npm run typecheck`. Expected: passes.

- [ ] **Step 3.3: Lint**

Run: `npm run lint`. Expected: passes.

- [ ] **Step 3.4: Commit**

```bash
git add src/app/productions/\[id\]/odg/\[odgId\]/page.tsx
git commit -m "feat(odg): add 'Personalizza' activity option with inline custom name input"
```

---

## Task 4: Manual verification

The project has no React component test harness, so verification is by exercising the dev server.

- [ ] **Step 4.1: Start the dev server**

Run: `npm run dev` (in a background-friendly terminal — keep it running until step 4.7).

Expected: server listens on `http://localhost:3000` (or the configured port).

- [ ] **Step 4.2: Open an ODG**

Navigate to an existing production with at least one ODG, open the ODG page. URL shape: `/productions/<id>/odg/<odgId>`.

- [ ] **Step 4.3: Verify the new option appears**

Click "Aggiungi blocco". Open the "Tipo di attività" dropdown.

Expected: the last entry of the dropdown is `Personalizza…`, after the last canonical activity (`Accordatura Cembalo`).

- [ ] **Step 4.4: Verify the input appears and accepts text**

Select `Personalizza…`.

Expected:
- A new field labelled "Nome attività" appears under the dropdown with placeholder "Nome attività personalizzata" and focus.
- Typing into it updates the field.

- [ ] **Step 4.5: Verify the empty-input guard**

With `Personalizza…` selected and the custom-name input empty, click "Aggiungi".

Expected: the browser blocks submit (HTML `required` validation; the input is focused with the native tooltip).

- [ ] **Step 4.6: Verify the happy path**

Type a custom name (e.g. `Prova ad-hoc 26 maggio`), fill in `Ora inizio` and `Ora fine`, optionally pick a `Sala / Luogo`, click "Aggiungi".

Expected:
- A new session block appears in the day programme with the custom name as activity.
- No toast about auto-populated figures appears (custom activity has no preset).
- The form closes and is reset.

- [ ] **Step 4.7: Verify the toggle-back behaviour**

Click "Aggiungi blocco" again. Select `Personalizza…`, type something, then select a canonical activity (e.g. `Prova di Scena`).

Expected:
- The "Nome attività" input disappears.
- Submit now uses the canonical activity and triggers the usual auto-population toast.

- [ ] **Step 4.8: Verify the edit form is unaffected**

Click the pencil icon on any existing session block.

Expected: the inline edit form shows only canonical activities — no `Personalizza…` option (out of scope by design).

- [ ] **Step 4.9: Stop the dev server**

Stop the running dev process.

---

## Self-review (already performed inline before saving)

- **Spec coverage:** UI (Task 3), state (Task 1), submit (Task 2), backend untouched (no task — by design), constants untouched (no task — by design), reset on cancel (Task 2.2), manual test (Task 4). All spec sections mapped.
- **Placeholders:** none.
- **Type consistency:** `customActivity: string` introduced in Task 1, referenced consistently in Tasks 2 and 3. The sentinel value `"__custom__"` is used identically in both tasks.
