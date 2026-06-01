# Slice 5: Session exercises sync

## Parent

[#15 PRD: Slice 2 — Supabase sync and multi-device persistence](https://github.com/Cmac2712/stronger/issues/15)

Supporting docs: [CONTEXT.md](CONTEXT.md), [docs/adr/0001-supabase-sync-architecture.md](docs/adr/0001-supabase-sync-architecture.md).

## What to build

Extend the sync stack to handle `session_exercises`. After this slice, adding or removing an exercise from a session on one device causes that change to appear on another. **Sets still do not sync** (slice 6) — sessions on the receiving device show their exercises but each exercise has zero sets.

User-facing behaviour after merge:

- Adding an exercise to the active session on device A: the row appears in Supabase in the background; UI on A is unchanged in feel.
- Removing an exercise (which tombstones it): the tombstone syncs.
- Foregrounding device B: the exercises added on A appear under their session (each with zero sets visible until slice 6).
- First-sign-in: existing local session exercises seed Supabase.

Internal shape:

- New migration creates `session_exercises`:
  ```sql
  create table session_exercises (
    id uuid primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    session_id uuid not null references sessions(id) on delete cascade,
    exercise_id text not null,
    "order" int not null,
    updated_at timestamptz not null,
    deleted_at timestamptz
  );
  alter table session_exercises enable row level security;
  -- four policies on user_id = auth.uid() (select/insert/update/delete)
  ```
  `exercise_id` is a `text` slug (e.g. `"barbell-bench-press"`) referencing the hardcoded library — no FK to a remote exercise table because the library is client-side static data per [PRD.md](PRD.md).
- `syncEngine` gains `upsertSessionExercise(row)` and `tombstoneSessionExercise(id)` granular ops.
- `localMirror` extends to store and read `session_exercises`.
- `workoutStore.addExerciseToSession` calls `syncEngine.upsertSessionExercise`; `workoutStore.removeExerciseFromSession` calls `syncEngine.tombstoneSessionExercise` (not a hard delete on the mirror — the row stays with `deleted_at` set, filtered out of UI reads).
- `syncEngine.pull()` extended to pull `session_exercises`.
- `syncEngine.loadState()` extended to include exercises under their sessions. The store still reads `sets` from the legacy `persistence` module — slice 6 closes that gap.

## Acceptance criteria

- [ ] Migration creates `session_exercises` table with the schema above and four RLS policies.
- [ ] `syncEngine.upsertSessionExercise` and `syncEngine.tombstoneSessionExercise` exist and follow the granular-op contract.
- [ ] `localMirror` stores `session_exercises` rows.
- [ ] `workoutStore.addExerciseToSession` calls `upsertSessionExercise` with `id`, `session_id`, `exercise_id`, `order`, `user_id` correctly populated.
- [ ] `workoutStore.removeExerciseFromSession` calls `tombstoneSessionExercise` and does **not** hard-delete from the mirror — the row remains with `deleted_at` set.
- [ ] UI reads filter `deleted_at IS NOT NULL` so removed exercises don't appear in the active-session screen or in History.
- [ ] `syncEngine.pull()` pulls `session_exercises` and reconciles them.
- [ ] `syncEngine.loadState()` assembles `PersistedState` with sessions and their exercises populated from the mirror; sets continue to come from the legacy `persistence` path.
- [ ] Cross-device demoable: add an exercise on device A, foreground device B, the exercise appears under its session.
- [ ] Cross-device tombstone demoable: remove an exercise on device A, foreground device B, the exercise disappears from device B's view of the session.
- [ ] First-sign-in demoable: existing local session exercises seed Supabase on first sign-in.
- [ ] `workoutStore` tests extended for `addExerciseToSession` and `removeExerciseFromSession` against a mocked `syncEngine`.
- [ ] `npm test` and `npm run typecheck` pass.

## Blocked by

- [#19 Slice 4: Sessions sync](https://github.com/Cmac2712/stronger/issues/19) — needs the `sessions` table and the granular-op pattern established.
