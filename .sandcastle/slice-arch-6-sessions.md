## Parent

#31 — PRD: Feature-based source layout with a single app-level store.

## What to build

Create the `src/features/sessions/` feature — the whole session lifecycle, active and historical, since CONTEXT.md treats them as two states of one Session. Move the active-workout screen, the history-list screen, the session-detail (amend) screen, plus SessionExerciseCard, RestTimerBar, SetRow, and NumericField into it. The folder is flat; tests colocated. Name the folder per the glossary (`sessions`), even though the symbols `WorkoutScreen`/`workoutStore` and the `"Workout"` route keep their current names (renames are explicit follow-up, out of scope here). Rewrite imports: sessions files reference `@shared/*`, `@state/*`, `@sync/*`, and the exercise library via `@features/exercises/*`. Use `git mv`.

Watch the `SetRow` name collision: the UI component moving here is distinct from the persisted sync row type that stays in `sync/`.

## Acceptance criteria

- [ ] `features/sessions/` contains the three session screens plus SessionExerciseCard, RestTimerBar, SetRow, NumericField (+ tests), flat, moved via `git mv`.
- [ ] Sessions files import via `@shared/*`, `@state/*`, `@sync/*`, and `@features/exercises/*` as appropriate.
- [ ] The UI `SetRow` (component) and the `sync` set row type remain distinct and unbroken.
- [ ] `npm run typecheck` passes and `npm test` is green.
- [ ] No change to runtime behavior — active logging, history view, and historical amend all work as before.

## Blocked by

- #32
- #33
- #34
- #36
