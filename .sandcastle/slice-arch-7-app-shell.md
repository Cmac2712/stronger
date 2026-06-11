## Parent

#31 — PRD: Feature-based source layout with a single app-level store.

## What to build

The final integration slice. Move the navigation shell into `src/app/`: RootNavigator and the navigation param lists. RootNavigator now imports the feature screens via `@features/*` and shared UI via `@shared/*`. `App.tsx` stays at the repo root as the Expo entrypoint (reached via `index.ts`) and is updated to import the relocated RootNavigator (plus the auth screens, store, and sync engine via their new aliases). Use `git mv` for RootNavigator.

This slice closes the move: with every fold relocated, the dependency direction is features → (`state`, `sync`, `shared`); `state` → `shared`; `sync` → `shared`; nothing → features. Run the full gate, including the Maestro smoke flow, to prove the app still wires up and runs end-to-end.

## Acceptance criteria

- [ ] RootNavigator (+ param lists) live under `src/app/`, moved via `git mv`; it imports feature screens via `@features/*` and shared UI via `@shared/*`.
- [ ] `App.tsx` remains the repo-root entrypoint and imports the relocated modules via their new aliases; `index.ts` is updated if needed.
- [ ] `src/screens/`, `src/components/`, `src/util/`, `src/data/`, `src/navigation/`, `src/supabase/`, and `src/store/` no longer exist (everything has moved to its fold).
- [ ] `npm run typecheck` passes, `npm test` is green, and `npm run e2e:smoke` (Maestro, no-backend) passes.
- [ ] No change to runtime behavior anywhere in the app.

## Blocked by

- #35
- #36
- #37
