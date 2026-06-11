## Parent

#31 — PRD: Feature-based source layout with a single app-level store.

## What to build

Relocate the single app-level store to `src/state/`. Move `workoutStore` and its colocated test into `state/` via `git mv`. The store stays one object — it is NOT split into per-feature stores (see ADR-0005). It continues to import the pure logic it depends on (rest-timer reducer, numeric parsing, id, types) from `@shared/*`. Rewrite every importer of the store across the repo to use `@state/*`.

This preserves the single source of truth for the connected Session entity graph and leaves sync reconciliation untouched.

## Acceptance criteria

- [ ] `workoutStore` (+ test) live under `src/state/`, moved via `git mv`.
- [ ] The store imports its shared dependencies via `@shared/*`; it imports from no feature.
- [ ] Every former importer of the store now uses `@state/*`.
- [ ] `npm run typecheck` passes and `npm test` is green.
- [ ] The store is still a single object; no behavioral change to actions, selectors, or sync wiring.

## Blocked by

- #32
