# Slice 6: Sets sync + retire `persistence` module

## Parent

[#15 PRD: Slice 2 — Supabase sync and multi-device persistence](https://github.com/Cmac2712/stronger/issues/15)

Supporting docs: [CONTEXT.md](CONTEXT.md), [docs/adr/0001-supabase-sync-architecture.md](docs/adr/0001-supabase-sync-architecture.md).

## What to build

The final slice: sets sync end-to-end, and the legacy `persistence` module retires. After this, the entire workout data path flows through `syncEngine`; the JSON-blob path is gone. The full multi-device experience from [PRD #15](https://github.com/Cmac2712/stronger/issues/15) is live.

User-facing behaviour after merge:

- Logging a set on device A: appears in Supabase in the background; UI on A unchanged in feel.
- Editing a set: the change syncs.
- Deleting a set: the tombstone syncs. The set vanishes from UI reads on both devices.
- The tombstone-vs-edit resurrection semantics from [CONTEXT.md](CONTEXT.md) work as described: a later edit beats an earlier delete; a later delete beats an earlier edit.
- Foregrounding device B: sets logged on A appear under their exercises.
- First-sign-in on a device with Slice-0 history: every set ever logged appears in Supabase.

Internal shape:

- New migration creates `sets`:
  ```sql
  create table sets (
    id uuid primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    session_exercise_id uuid not null references session_exercises(id) on delete cascade,
    set_number int not null,
    reps int not null,
    weight numeric not null,
    updated_at timestamptz not null,
    deleted_at timestamptz
  );
  alter table sets enable row level security;
  -- four policies on user_id = auth.uid() (select/insert/update/delete)
  ```
- `syncEngine` gains `upsertSet(row)` and `tombstoneSet(id)` granular ops.
- `localMirror` extends to store and read `sets`.
- `workoutStore.logSet` calls `syncEngine.upsertSet`.
- `workoutStore.updateSet` calls `syncEngine.upsertSet` with the patched row (LWW handles the rest).
- `workoutStore.deleteSet` calls `syncEngine.tombstoneSet`; rows are **not** hard-deleted from the mirror.
- `localMirror.loadState()` filters `deleted_at IS NOT NULL` from sets, exercises, and sessions before assembling the UI-facing `PersistedState`.
- `syncEngine.pull()` extended to pull `sets`.
- `syncEngine.loadState()` now assembles the complete `PersistedState` — sessions, exercises, and sets all from the mirror. The legacy `persistence.loadState`/`saveState` path is no longer called.
- **Retirement:**
  - The [src/persistence/](src/persistence/) directory is deleted in its entirety.
  - `workoutStore` no longer imports from `persistence`.
  - `SCHEMA_VERSION` is removed from [src/types.ts](src/types.ts); `PersistedState` loses its `schemaVersion` field.
  - The `isPersistedState` validation that checked `schemaVersion` is gone.
  - The "loadState returns null on unknown schemaVersion" test in [src/persistence/persistence.test.ts](src/persistence/persistence.test.ts) is removed alongside the rest of the file. Its replacement — "client tolerates unknown columns in remote rows" — is added as a `syncEngine`-level test or a `reconciler`-level test (whichever is the natural home).
  - The on-disk AsyncStorage key `workout/state/v1` is no longer written to. A one-shot best-effort delete on first run of this slice is acceptable but not required (the orphaned key is harmless).

## Acceptance criteria

- [ ] Migration creates `sets` table with the schema above and four RLS policies.
- [ ] `syncEngine.upsertSet` and `syncEngine.tombstoneSet` exist and follow the granular-op contract.
- [ ] `localMirror` stores `sets` rows including tombstones.
- [ ] `workoutStore.logSet`, `updateSet`, `deleteSet` call `syncEngine` ops; no calls into `persistence` remain in the store.
- [ ] `deleteSet` writes a tombstone (`deleted_at` set), does not hard-delete.
- [ ] `localMirror.loadState()` filters all tombstoned rows (sessions, exercises, sets) out of the UI-facing `PersistedState`.
- [ ] `syncEngine.pull()` pulls `sets` and reconciles them.
- [ ] `syncEngine.loadState()` is the sole source of UI hydration; the store no longer calls `persistence.loadState`.
- [ ] [src/persistence/](src/persistence/) directory deleted.
- [ ] [src/types.ts](src/types.ts) no longer exports `SCHEMA_VERSION`; `PersistedState` no longer has `schemaVersion`.
- [ ] All references to `SCHEMA_VERSION` removed throughout the codebase.
- [ ] [src/persistence/persistence.test.ts](src/persistence/persistence.test.ts) is removed.
- [ ] `reconciler` tests are extended to explicitly cover the tombstone-vs-edit resurrection cases for `sets`.
- [ ] Cross-device demoable: log a set on device A, foreground device B, the set appears.
- [ ] Cross-device tombstone demoable: delete a set on device A, foreground device B, the set vanishes.
- [ ] Cross-device resurrection demoable: with both devices offline, edit a set on A and delete the same set on B; reconnect both; the version with the higher `updated_at` wins; if edit > delete the row stays alive on both devices, if delete > edit the row stays gone on both.
- [ ] First-sign-in seeding end-to-end test: a real Slice-0 AsyncStorage blob (with multiple sessions, exercises, and sets) is detected and seeded to Supabase via the standard reconciliation — no special code path. After sign-in, every set is queryable in Supabase Studio.
- [ ] All existing `workoutStore.test.ts` behavioural tests pass.
- [ ] `npm test` and `npm run typecheck` pass.

## Blocked by

- [#20 Slice 5: Session exercises sync](https://github.com/Cmac2712/stronger/issues/20) — needs `session_exercises` in place (FK target for `sets`).
