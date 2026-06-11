## Parent

#31 — PRD: Feature-based source layout with a single app-level store.

## What to build

The foundation slice of the feature-based move. Two things, together because the aliases earn their keep immediately:

1. Add the four path aliases — `@features/*`, `@shared/*`, `@state/*`, `@sync/*` — to all three resolvers that must agree: TypeScript `paths`, the babel `module-resolver` plugin, and the jest `moduleNameMapper`. The existing `@/*` → repo root (used by gluestack) stays. The `@features`/`@state`/`@sync` aliases may point at folders that don't exist yet; that's fine — they're unused until later slices.
2. Create `src/shared/` and move the genuinely cross-feature code into it: the shared domain types, the theme tokens, the `Icon` component (into `shared/ui/`), and the generic helpers `format`, `parseNumericInput`, `id`, and the rest-timer logic (into `shared/lib/`), each with its colocated test. Rewrite every importer across the repo to use `@shared/*`.

Use `git mv` so per-file history is preserved. No runtime behavior changes.

## Acceptance criteria

- [ ] `@features/*`, `@shared/*`, `@state/*`, `@sync/*` resolve identically in tsconfig, babel, and jest; `@/*` still works.
- [ ] `shared/` contains the shared types, theme, `ui/Icon`, and `lib/{format,parseNumericInput,id,restTimer}` plus their tests, moved via `git mv`.
- [ ] Every former importer of those files now imports them via `@shared/*`.
- [ ] `npm run typecheck` passes and `npm test` is green.
- [ ] No change to runtime behavior.

## Blocked by

- None — can start immediately.
