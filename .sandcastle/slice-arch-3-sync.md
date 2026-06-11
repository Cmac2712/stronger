## Parent

#31 — PRD: Feature-based source layout with a single app-level store.

## What to build

Consolidate the offline-first persistence layer under `src/sync/` as infrastructure (not a feature). The sync engine, reconciler, mutation queue, local mirror, sync status, and sync row types already live here. Fold in the Supabase client and config (and the config test) so the backend connection sits beside the engine that uses it. Ensure the engine's shared dependencies (types, id) import via `@shared/*`. Rewrite importers of the Supabase client/config to use `@sync/*`.

Note: the auth-code helper stays out of this slice — it is auth-specific and moves into `features/auth` in a later slice.

## Acceptance criteria

- [ ] The Supabase client and config (+ config test) live under `src/sync/`, moved via `git mv`.
- [ ] The sync engine imports shared code via `@shared/*`.
- [ ] Importers of the Supabase client/config (auth screen, App entrypoint, sync engine) reference them via `@sync/*`.
- [ ] `npm run typecheck` passes and `npm test` is green (reconciler and mutation-queue tests included).
- [ ] No change to the sync algorithm or runtime behavior.

## Blocked by

- #32
