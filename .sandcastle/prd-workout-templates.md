## Problem Statement

Starting a workout in Stronger today means starting empty and adding every exercise by hand from the picker, every single time. There is no way to reuse the shape of a workout you do regularly (a Push day, a Pull day), no way to capture a good session you just finished so you can repeat it, and no help deciding what to train when you don't want to think about it. The fastest path to "log a working set" still begins with a blank session and a series of taps.

## Solution

Introduce **templates** — named, ordered lists of exercises — as a faster way to begin a session, plus an **AI workout** option that generates a session for you.

- A small set of read-only **builtin templates** (Push, Pull, Legs) ships with the app.
- After finishing any non-empty workout, a **Workout-complete summary screen** offers to save it as a **user template** (the distinct exercises you actually logged), which then appears in your own list and syncs across devices.
- An **AI workout** option asks one question — which **split** (Push / Pull / Legs / Upper / Lower / Full body) — and generates a session from your recent history, favouring movements you actually do. It starts the workout immediately ("generate-and-go").

Applying any template (builtin, user, or AI-generated) starts a session pre-filled with its exercises; the existing per-exercise prefill fills in reps/weight from your history exactly as it does today. The idle Workout screen becomes a launch screen surfacing all three paths.

## User Stories

1. As a lifter, I want a small set of ready-made workout templates, so that I can start a structured session without building it from scratch.
2. As a lifter, I want to tap a builtin "Push" template and have a session start with push exercises already added, so that I can begin logging immediately.
3. As a lifter, I want builtin templates for Push, Pull, and Legs, so that the common training splits are covered out of the box.
4. As a lifter, I want the builtin templates to be read-only, so that I can't accidentally delete or corrupt the starting content.
5. As a lifter, I want to save a workout I just finished as a template, so that I can repeat that workout in future without rebuilding it.
6. As a lifter, when I complete a workout, I want to see a summary of what I did (duration, total sets, per-exercise breakdown), so that I get a sense of the session before leaving it.
7. As a lifter, I want the "Save as template" action on that summary screen, so that saving is a natural step at the moment I've just done the work.
8. As a lifter, I want a saved template to contain only the exercises I actually logged at least one set for, so that exercises I added but skipped don't pollute the template.
9. As a lifter, I want the saved template's exercises in the order I first did them, so that the template reflects how I actually trained.
10. As a lifter, I want to name a saved template, with a sensible default pre-filled, so that I can identify it later without being forced to think of a name.
11. As a lifter, I want the default template name derived from the dominant muscle groups (e.g. "Chest & Back"), so that the suggestion is meaningful.
12. As a lifter, I want my saved (user) templates to appear in a list separate from the builtin ones, so that I can tell mine apart from the defaults.
13. As a lifter, I want to apply one of my own templates to start a session, the same way builtin templates work, so that the experience is consistent.
14. As a lifter, I want to delete a user template I no longer want, so that my list stays relevant.
15. As a lifter, I want to delete a user template by swiping it, so that management uses the same gesture as elsewhere in the app.
16. As a lifter, I want builtin templates to have no delete action, so that the read-only ones are clearly distinguished from mine.
17. As a lifter, I want my user templates to sync across my devices, so that a template I saved on my phone is available on my iPad.
18. As a lifter, I want template changes (save, delete) to work offline and sync later, so that I'm never blocked by connectivity for my own templates.
19. As a lifter, I want an "AI workout" option, so that I can get a session generated for me when I don't want to plan one.
20. As a lifter, I want the AI to ask me which split I want (Push / Pull / Legs / Upper / Lower / Full body), so that the generated session matches what I want to train today.
21. As a lifter, I want the AI to ask only that one question, so that I'm training within a tap or two rather than filling out a form.
22. As a lifter, I want the AI to base its picks on my previous workouts, favouring exercises I actually perform, so that the generated session feels like mine rather than generic.
23. As a lifter, I want the AI-generated session to start immediately once it's ready, so that there's no extra confirmation step between generating and training.
24. As a lifter, I want the AI to only ever pick exercises that exist in the app's library, so that a generated session never contains a broken or unrecognised exercise.
25. As a lifter, I want to be able to save an AI-generated workout as a template after I finish it, so that a generation I liked becomes reusable — using the same save flow as any other workout.
26. As a lifter, I don't want every AI generation automatically saved as a template, so that my template list isn't cluttered with one-off experiments.
27. As a lifter, I want the AI workout option disabled when I'm offline, with a hint why, so that I don't tap into a guaranteed failure.
28. As a lifter, if AI generation fails or times out, I want a clear error and to stay on the launch screen, so that I can retry, pick a template, or start empty.
29. As a lifter, I never want a half-started session if generation fails, so that the app's state stays clean (a session is created only after a valid exercise list comes back).
30. As a lifter, I want the idle Workout screen to be my launch screen — Start Workout, AI workout, and my template lists — so that every way to begin is in one place.
31. As a lifter, I want the launch screen to keep the plain "Start Workout" (empty) option, so that I can still start a blank session when I want to.
32. As a lifter, I want templates and the AI option on the existing Workout tab rather than a new tab, so that the app stays simple.
33. As a lifter applying a template that includes an exercise I want to drop today, I want to remove it from the session as normal, so that a template is a starting point, not a contract.
34. As a lifter, I want applying a template to start a fresh session (it's only offered when no session is active), so that there's no ambiguity about appending to an in-progress workout.
35. As a returning lifter with months of history, I want AI generation to remain fast, so that I'm not waiting on a slow model before training.
36. As a privacy-conscious lifter, I want my workout data sent for AI generation to go through my authenticated account, not exposed via a key shipped in the app, so that my data and the integration stay secure.
37. As a lifter whose library gains a new exercise in a future release, I want the AI to be able to pick it automatically, so that generation stays current without a manual prompt change.
38. As a lifter, I want a saved template that references an exercise later removed from the library to degrade gracefully (the missing exercise is skipped), so that an old template never crashes the app.

## Implementation Decisions

Respects [ADR-0005](docs/adr/0005-feature-based-structure-single-store.md) (feature-based layout, single store), [ADR-0006](docs/adr/0006-templates-single-table-array-column.md) (templates storage), and [ADR-0007](docs/adr/0007-ai-template-generation-edge-function.md) (AI architecture). Glossary terms (`Template`, `Template exercise`, `Builtin/User template`, `AI workout`, `Split`) are defined in [CONTEXT.md](CONTEXT.md).

**Domain shape.** A `Template` is `{ id, name, exerciseIds: string[] }` — a named, ordered list of library exercise ids, with no sets or targets. There are exactly two sources: *builtin* (hardcoded) and *user* (saved, synced). The AI does **not** introduce a third source — it produces a session directly.

**Module: `templateLibrary` (new, `features/exercises` or a new `features/templates`).** Hardcoded, read-only, mirror of `exerciseLibrary`. Holds the three builtin templates (Push, Pull, Legs), each referencing library exercise ids, and exports the fixed `Split` set (Push, Pull, Legs, Upper, Lower, Full body). Interface: `getAll()`, `getById(id)`. Builtin template ids are stable, namespaced strings (e.g. `builtin-push`).

**Module: `templateFromSession` (new, pure).** `Session → { name, exerciseIds }`. Selects the distinct `exerciseId`s of session exercises that have ≥1 `Set`, in first-appearance order; derives a default name from the dominant muscle groups of those exercises (via the exercise library). No I/O.

**Module: `historySummary` (new, pure).** `Session[] → { exerciseId, count, lastPerformedAt }[]` over exercises with ≥1 set. The compact payload the client sends to the AI; encodes "favour what you do."

**Module: `buildWorkoutRequest` (new, pure, shared with the edge function).** `{ split, summary } → Claude request` (system prompt + `output_config.format` schema). The schema constrains the response so FK integrity holds at generation time:

```
// response schema (decision shape — enum is the full set of library ids)
{ type: "object", additionalProperties: false,
  required: ["exerciseIds"],
  properties: {
    exerciseIds: { type: "array",
      items: { type: "string", enum: [<every exerciseLibrary id>] } } } }
```

The `enum` is derived from `exerciseLibrary.getAll()` at build/call time, never hand-maintained, so adding a library exercise widens AI selection automatically (US #37).

**Module: `workoutStore` extension (modify, `state/`).** Add `templates: Template[]` to `PersistedState` (user templates only; builtin are merged at read time). New actions: `saveTemplate({ name, exerciseIds })`, `deleteTemplate(id)`, `applyTemplate(exerciseIds)`, and a `getTemplates()` selector returning builtin + user with a `source` marker. `applyTemplate` composes the existing `startSession()` + `addExerciseToSession()` per id, in order (start-only; only valid when no active session). Save/delete go through the same mutation-callback → syncEngine path as sessions, stamping `updated_at = Date.now()`.

**Sync (modify, `sync/`).** New `templates` table per ADR-0006:

```
templates ( id uuid pk, user_id uuid, name text,
            exercise_ids text[],  -- ordered
            updated_at timestamptz, deleted_at timestamptz )  -- RLS: user_id = auth.uid()
```

Add: a migration; `localMirror` read/write for template rows; `buildTemplateMutation`; `upsertTemplate` / `tombstoneTemplate` in `syncEngine`; a reconcile block in `pull()` (reuses the generic per-row LWW `reconcile`); and a row↔`Template` mapping (analogue of `rowsToSessions`). Whole-row LWW is the conflict unit — templates are replaced/deleted wholesale, never edited per-exercise.

**Edge Function (new, `supabase/functions/generate-workout`).** Deno + `@anthropic-ai/sdk`. Stateless. Contract:
- Request (from authenticated client): `{ split: Split, summary: HistorySummary }`.
- Calls `buildWorkoutRequest(...)` → Anthropic `claude-haiku-4-5` with structured output.
- Response: `{ exerciseIds: string[] }` (guaranteed library ids), or an error status.
- `ANTHROPIC_API_KEY` is a Supabase secret; the function authenticates the caller via the Supabase JWT.

**AI client (new, `features/templates` or `sync/`).** `requestAiWorkout(split)`: guards on the existing online signal (disabled offline), assembles `historySummary` from the store, calls the function with the JWT, returns `exerciseIds`. On success the caller invokes `applyTemplate(exerciseIds)`; on failure it surfaces an error and starts nothing (US #28, #29).

**UI.**
- `WorkoutCompleteScreen` (new, in the Workout stack): reached by navigating after `endSession()` for a non-empty session; shows duration, total set count, per-exercise breakdown (set count, top set); primary action "Save as template" (name prompt pre-filled via `templateFromSession`); secondary "Done" → idle. Empty sessions skip it.
- `IdleView` rework (modify `WorkoutScreen`): launch screen with Start Workout (empty), AI workout (split picker → generate-and-go, disabled offline), and two template sections — *Builtin* and *Yours* — each row tappable to `applyTemplate`. User-template rows use the existing swipe-to-delete; builtin rows have no delete.
- `AiSplitPicker` (new): single-choice split selection, then generate-and-go.

## Testing Decisions

A good test asserts **external behaviour through the module's public interface**, not internal structure: given inputs, assert outputs/observable state. Tests must not couple to private helpers or representation. Prior art in this repo: `state/workoutStore.test.ts` (drives store actions, asserts resulting `PersistedState` and emitted sync callbacks), `sync/reconciler.test.ts` and `sync/mutationQueue.test.ts` (per-row LWW and queue behaviour), `shared/lib/*.test.ts` (`format`, `parseNumericInput`, `restTimer` — pure-function tables), and `.maestro/` flows (end-to-end smoke).

Unit tests will be written for **all of modules 1–7**:

1. **`templateLibrary`** — assert every builtin template's `exerciseIds` resolve via `exerciseLibrary.getById` (guards FK integrity for builtin content); assert the `Split` set is the agreed six.
2. **`templateFromSession`** — table-driven: distinct exercises with ≥1 set only, first-appearance order, exercises with zero sets dropped, dominant-muscle-group default name, ties/edge cases (single group, empty session).
3. **`historySummary`** — correct `count` and `lastPerformedAt` per exercise; only exercises with ≥1 set; ordering/stability.
4. **`buildWorkoutRequest`** — the response schema's `exerciseIds` enum equals the full set of `exerciseLibrary` ids; the prompt includes the split and the summary; adding a library exercise widens the enum (drift guard).
5. **`workoutStore` template actions** — via the store harness (like `workoutStore.test.ts`): `saveTemplate` adds to `PersistedState.templates` and emits the upsert callback; `deleteTemplate` tombstones and emits; `applyTemplate` starts a session and adds the exercises in order (and is a no-op/guarded when a session is active); `getTemplates()` merges builtin + user with correct `source`.
6. **template sync mapping + wiring** — row↔`Template` round-trip mapping (analogue of the `rowsToSessions` coverage), and that template rows reconcile under the existing per-row LWW (a later `updated_at` wins; tombstone vs edit resolves per the existing rules).
7. **`generate-workout` edge function** — against a **mocked Anthropic client**: asserts the request is built via `buildWorkoutRequest` (enum = library ids), the model is `claude-haiku-4-5`, a well-formed model response is returned as `{ exerciseIds }`, and auth/`split` validation failures return the right error status. No live network.

UI modules (8–10: `WorkoutCompleteScreen`, `IdleView` launch screen, `AiSplitPicker`) are covered by **Maestro e2e smoke** in the existing style, not jest unit tests — e.g. complete a workout → save as template → see it under "Yours" → apply it → see its exercises in a new session.

## Out of Scope

- **Manual template builder** — a screen to hand-pick exercises into a template without performing a workout. The only creation path is save-from-workout. (Flagged as a likely future addition.)
- **Editing a saved template** — no per-exercise add/remove/reorder on an existing template; templates are created and deleted whole (this is what makes whole-row LWW correct per ADR-0006). Re-save a fresh workout instead.
- **A second AI question** (exercise count, emphasis, equipment) — split-only for v1.
- **Recency / recovery logic** (avoid muscle groups trained recently) and **progression weighting** in AI generation — v1 is "favour what you do" only.
- **Server-side history fetch** — the client sends the summary; the edge function stays stateless. Revisit if the payload grows.
- **Hiding builtin templates** — they are read-only and always shown; no per-user hide.
- **A dedicated Templates tab** — everything lives on the Workout tab's launch screen.
- **Target sets/reps/weights in templates** — templates carry exercises only; numbers come from the existing prefill.

## Further Notes

- The AI workout is the only feature that requires network; everything else (applying templates, saving, deleting, syncing) follows the existing offline-first model and works offline.
- Glossary discipline: in code and docs use **template**, **builtin/user template**, **AI workout**, **split**; avoid "AI template" (the AI does not create a `Template` entity — its output is a session unless the user saves it afterward).
- The `enum`-constrained structured output is the load-bearing mechanism for US #24/#37 — it both prevents invalid ids and auto-extends to new library exercises, so neither needs separate runtime validation.
- Build/CI gate stays as the existing `typecheck` + `jest` + `e2e:smoke`.
