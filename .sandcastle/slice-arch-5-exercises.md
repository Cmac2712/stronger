## Parent

#31 — PRD: Feature-based source layout with a single app-level store.

## What to build

Create the `src/features/exercises/` feature — "everything about a single exercise." Move the exercise picker screen, the per-exercise history screen, the Sparkline component, and the exercise library data into it. The folder is flat; tests colocated. The per-exercise history view reads session data via a store selector — that cross-feature read (`exercises` → `@state`) is intentional and allowed under the soft-boundary design. Rewrite imports: exercises files reference `@shared/*` and `@state/*`; existing importers of the exercise library (e.g. in the sessions screens/components, still in their old locations until a later slice) reference it via `@features/exercises/*`. Use `git mv`.

## Acceptance criteria

- [ ] `features/exercises/` contains the picker, the per-exercise history screen, Sparkline, and the exercise library (+ any tests), flat, moved via `git mv`.
- [ ] The per-exercise history view reads session history via a `@state/*` selector.
- [ ] Every importer of the exercise library now references it via `@features/exercises/*`.
- [ ] `npm run typecheck` passes and `npm test` is green.
- [ ] No change to runtime behavior (picker, per-exercise Sparkline).

## Blocked by

- #32
- #33
