## Problem Statement

As the sole developer of Stronger, I find the source tree organized by technical layer (`screens/`, `components/`, `store/`, `sync/`, `util/`, `data/`, `navigation/`, `supabase/`). To work on a single capability — say, adding sets to a historical session — I have to jump between `screens/SessionDetailScreen.tsx`, `components/SetRow.tsx`, `components/SessionExerciseCard.tsx`, `store/workoutStore.ts`, and `util/`, because the files that change together do not live together. The layering tells me *what kind of file* something is, but not *what it is for*, so navigation is slower than it should be and the natural seams of the app are invisible in the folder structure.

## Solution

Reorganize `src/` so the files for one capability sit together, grouped by feature (vertical slice) rather than by technical role. Three user-facing features — **auth**, **sessions**, **exercises** — each get a folder under `src/features/`. App-wide concerns that are genuinely cross-feature live in sibling folders: `src/state/` (the single store), `src/sync/` (offline-first infrastructure), `src/shared/` (cross-feature UI, theme, types, generic helpers), and `src/app/` (the navigation shell). Path aliases make imports read by intent (`@shared/theme`, `@state/workoutStore`) and survive future moves. The move is mechanical and behavior-preserving: nothing about how the app runs changes, only where the files are and how they are imported. This is documented in ADR-0005.

## User Stories

1. As the developer, I want each user-facing capability to have its own folder under `src/features/`, so that I can find everything related to it in one place.
2. As the developer, I want active logging and historical amend to live in one `sessions` feature, so that the shared `SetRow` and log/edit/delete actions are not split across folders — matching the glossary, which treats *active* and *historical* as two states of one Session.
3. As the developer, I want the `auth` feature to hold the sign-in, sign-up, and verify-email screens, the AuthBrandMark, and the auth-code helper, so that the entire authentication flow is self-contained.
4. As the developer, I want the `exercises` feature to hold the exercise picker, the exercise library data, and the per-exercise history view with its Sparkline, so that "everything about a single exercise" lives together.
5. As the developer, I want a single app-level store in `src/state/` rather than per-feature stores, so that the one connected Session entity graph (which feeds active logging, the history list, and the per-exercise Sparkline) stays a single source of truth and sync reconciliation can keep rewriting `activeSession` and `history` atomically.
6. As the developer, I want the offline-first sync engine to stay together in `src/sync/` as infrastructure (not a feature), with the Supabase client and config folded in, so that the persistence layer is clearly distinct from the user-facing features that depend on it.
7. As the developer, I want truly cross-feature code — the `Icon` component, the theme tokens, the shared domain types, and generic helpers (format, numeric parsing, id, rest-timer logic) — to live in `src/shared/`, so that no feature owns code that several features (or the store) depend on.
8. As the developer, I want the navigation shell (RootNavigator and its param lists) in `src/app/`, so that the composition root that wires features into tabs and stacks is separate from the features themselves.
9. As the developer, I want path aliases `@features/*`, `@shared/*`, `@state/*`, and `@sync/*` alongside the existing `@/*`, so that imports read by intent and do not churn when files move within a fold.
10. As the developer, I want each feature folder to be flat (no `screens/`/`components/` sub-folders), so that small features (4–7 files) are not buried under needless nesting.
11. As the developer, I want unit tests to stay colocated next to the source they cover, so that a file and its test move together and stay easy to find.
12. As the developer, I want files moved with `git mv`, so that per-file history is preserved through the reorganization.
13. As the developer, I want the feature folder named after the glossary term (`session`/`sessions`, not `workout`), so that the structure speaks the project's ubiquitous language even while `WorkoutScreen`/`workoutStore` symbol renames remain optional follow-up.
14. As the developer, I want `App.tsx` to remain the repo-root Expo entrypoint (via `index.ts`) and simply import the relocated RootNavigator, so that the entrypoint convention is undisturbed.
15. As the developer, I want a feature to be able to read another feature's data via a store selector (e.g. `exercises` reading session history for the Sparkline) without a hard barrier, so that soft boundaries keep the move low-ceremony.
16. As the developer, I want `typecheck`, `jest`, and `e2e:smoke` all green after the move, so that I have objective confirmation that behavior is unchanged.
17. As the developer, I want no public-API barrels, no enforced import-boundary lint, and no monorepo packaging, so that the structure stays appropriate for a single-user app maintained by one person.
18. As the developer, I want the app to remain a single bounded context (one `CONTEXT.md`, no `CONTEXT-MAP.md`), so that features are understood as vertical slices of one ubiquitous language rather than separate contexts.

## Implementation Decisions

**Goal and boundary strength.** Feature-based for navigability and colocation, with *soft* boundaries: no public-API barrels, no lint-enforced import rules, no monorepo. Features may import each other where it is natural (notably `exercises` reading a session selector from the store). Recorded in ADR-0005.

**Top-level shape.** Under `src/`:
- `features/{auth,sessions,exercises}/` — vertical slices, flat internally, tests colocated.
- `state/` — the single app-level store.
- `sync/` — offline-first infrastructure (sync engine, reconciler, mutation queue, local mirror, sync status, sync row types) plus the Supabase client and config.
- `shared/` — `ui/` (Icon), theme, shared domain types, and `lib/` (format, numeric parsing, id, rest-timer logic).
- `app/` — the navigation shell (RootNavigator + navigation param lists).
- `App.tsx` stays at the repo root as the Expo entrypoint.

**Feature ownership.**
- `auth` — sign-in / sign-up / verify-email screens, AuthBrandMark, the auth-code extraction helper (and its test).
- `sessions` — the active-workout screen, the history list, the session-detail (amend) screen, SessionExerciseCard, RestTimerBar, SetRow, NumericField.
- `exercises` — the exercise picker, the per-exercise history screen, Sparkline, the exercise library data.

**Single store, not split.** The store stays one object and relocates to `state/`. Per-feature stores were rejected because the same Session entities serve active logging, history, and the per-exercise Sparkline, and reconciliation rewrites `activeSession` + `history` atomically. Consequence: the pure logic the store depends on (rest-timer reducer, numeric parsing, id) must live in `shared/` (or `state/`), never inside a feature — an app-level store must not import from a feature.

**Sync as infrastructure.** `sync/` is not a feature. The Supabase client and config move in beside it; features and the store depend on infrastructure, not the reverse. The auth-code helper, being auth-specific, moves into the `auth` feature instead.

**Placement rule for ambiguous files.** Shared if used by two or more features or by the app-level store; otherwise feature-local. This is what sends `format` to `shared` (sessions + exercises), keeps `NumericField` in `sessions` (only SetRow uses it), and forces `restTimer`/`parseNumericInput`/`id` into `shared` (the store uses them).

**Path aliases.** Add `@features/*`, `@shared/*`, `@state/*`, `@sync/*` to all three resolvers that must agree: TypeScript `paths`, the babel `module-resolver` plugin, and the jest `moduleNameMapper`. The existing `@/*` → repo root (used by gluestack) stays.

**Known footgun.** Two distinct `SetRow`s exist: the UI component (moving to `features/sessions`) and the persisted sync row type (staying in `sync`). Different folders make this safe, but the shared name should be kept in mind during the move.

**Documentation.** `CONTEXT.md` is unchanged — the move is an architecture decision, not a glossary change, and the glossary already prefers *session* over *workout*. The decision and its rejected alternatives are recorded in ADR-0005. The app remains a single bounded context: no `CONTEXT-MAP.md`.

## Testing Decisions

A good test here asserts external behavior, not file location or import wiring — and this PRD deliberately adds none, because a behavior-preserving move should be proven by the *existing* suite continuing to pass, not by new tests.

- **What moves with what.** Every colocated unit test travels with its source file: the store test, the sync tests (reconciler, mutation queue), the auth-code-helper test, the config test, the theme test, and the helper tests (format, numeric parsing, rest-timer). The only edits to test files are import-path updates.
- **Regression gate.** The move is considered correct only when `typecheck` passes (proving the alias resolvers and import rewrites are consistent), `jest` is green (proving unit behavior is unchanged), and `e2e:smoke` — the Maestro no-backend flow — passes (proving the app still wires up and runs).
- **Prior art.** The existing tests are the prior art; no new test *type* is introduced. If any test references a moved module by a path that an alias now covers, prefer the alias in the rewrite to match the new convention.

## Out of Scope

- Renaming `WorkoutScreen`, `workoutStore`, or the `"Workout"` route to glossary-aligned `Session*` names. Optional follow-up, tracked separately.
- Splitting the store into per-feature stores, or introducing a slice pattern inside it.
- Any enforced-modularity machinery: public-API barrels, import-boundary lint rules, dependency-cruiser, or monorepo/workspace packaging.
- Resolving the `SetRow` name collision by renaming either `SetRow`.
- Any change to runtime behavior, the Supabase schema, the sync algorithm, or the UI.
- Introducing a second bounded context or a `CONTEXT-MAP.md`.

## Further Notes

- The move is mechanical: `git mv` each file to its destination, add the alias config to the three resolvers, rewrite imports, then drive `typecheck` + `jest` + `e2e:smoke` to green. It can land as one big-bang commit or be sliced per fold (alias scaffolding first, then `shared`/`state`/`sync`, then each feature, then `app`) — the work units above map to either.
- Dependency direction to preserve throughout: features → (`state`, `sync`, `shared`); `state` → `shared`; `sync` → `shared`; nothing → features.
- See ADR-0005 (`docs/adr/0005-feature-based-structure-single-store.md`) for the full rationale and rejected alternatives.
