# Slice 4: Sessions sync

## Parent

[#15 PRD: Slice 2 — Supabase sync and multi-device persistence](https://github.com/Cmac2712/stronger/issues/15)

Supporting docs: [CONTEXT.md](CONTEXT.md), [docs/adr/0001-supabase-sync-architecture.md](docs/adr/0001-supabase-sync-architecture.md).

## What to build

Extend the sync stack from slice 3 to handle the `sessions` table. Starting and ending a session on one device causes the session row to appear on another. **Session exercises and sets do not sync yet** (added in slices 5 and 6) — sessions appear cross-device but are empty shells on the receiving device until those slices land.

User-facing behaviour after merge:

- Starting a session on device A: the session row appears in Supabase in the background, with no UI wait.
- Ending the session: `ended_at` is updated; the session moves from active to historical on device A.
- Foregrounding device B: the session appears in the History tab on B (with zero exercises because that table doesn't sync yet).
- Offline session start/end: queued and drained on reconnect.
- An existing local session in AsyncStorage seeds Supabase on first sign-in.

Internal shape:

- New migration creates `sessions`:
  ```sql
  create table sessions (
    id uuid primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    started_at bigint not null,
    ended_at bigint,
    updated_at timestamptz not null,
    deleted_at timestamptz
  );
  alter table sessions enable row level security;
  create policy "own sessions read"   on sessions for select using (user_id = auth.uid());
  create policy "own sessions insert" on sessions for insert with check (user_id = auth.uid());
  create policy "own sessions update" on sessions for update using (user_id = auth.uid()) with check (user_id = auth.uid());
  create policy "own sessions delete" on sessions for delete using (user_id = auth.uid());
  ```
  Note `started_at` / `ended_at` are stored as `bigint` (epoch ms) to match `PersistedState`'s existing shape — no Date-vs-string conversion in the data path.
- `syncEngine` gains `upsertSession(session)` and `tombstoneSession(sessionId)` granular ops. Each stamps `updated_at`, writes mirror, enqueues upload.
- `localMirror` is extended to store and read `sessions` rows.
- `workoutStore.startSession` and `workoutStore.endSession` are refactored to call `syncEngine.upsertSession`. They no longer reach into the `persistence` module for the session-level writes (the per-store-action snapshot path is being torn down piece by piece across slices 4-6; sessions go first).
- `syncEngine.pull()` is extended to pull `sessions` rows alongside `user_settings` and run them through the `reconciler` (which is shape-agnostic and needs no per-table changes).
- `syncEngine.loadState()` exists and assembles a `PersistedState`-shaped object from the local mirror tables for the store to hydrate from on boot. In this slice, `loadState()` reads sessions from the mirror but reads `sessionExercises` and `sets` as empty arrays (those tables don't exist yet). The store continues to read `sessionExercises` and `sets` data from the old `persistence` module — `loadState()` is wired up only for sessions.
- The store's on-boot hydration is split: sessions come from `syncEngine.loadState()`; everything else (including `sessionExercises` and `sets` inside each session) is layered in from `persistence.loadState()` until slices 5 and 6 retire that path. **This is messy on purpose** — the transitional state during slices 4 and 5 must not break the UI, and the cleanup happens in slice 6 when `persistence` retires.

## Acceptance criteria

- [ ] Migration creates `sessions` table with the schema above and the four RLS policies.
- [ ] `syncEngine.upsertSession` and `syncEngine.tombstoneSession` exist and behave per the granular-op contract (stamp `updated_at`, write mirror, enqueue upload).
- [ ] `localMirror` stores `sessions` rows alongside `user_settings`.
- [ ] `workoutStore.startSession` calls `syncEngine.upsertSession` with a row whose `id`, `started_at`, `ended_at: null`, `user_id` are correctly populated.
- [ ] `workoutStore.endSession` calls `syncEngine.upsertSession` to update `ended_at`.
- [ ] `syncEngine.pull()` pulls `sessions` from Supabase (rows where `updated_at > last_pulled_at`) and runs them through the reconciler.
- [ ] Reconciler covers `sessions` rows correctly — but no new reconciler code is needed: the existing pure function is shape-agnostic and the existing tests already prove it. Add a small integration-style test that exercises sessions specifically.
- [ ] Cross-device demoable: start a session on device A, end it, foreground device B, the session appears in History on B (with zero exercises).
- [ ] Offline demoable: start/end a session offline, reconnect, foreground device B, session appears.
- [ ] First-sign-in demoable: on a device with existing Slice-0 sessions in AsyncStorage, sign in, observe that all local sessions are seeded to Supabase (visible in Supabase Studio).
- [ ] `workoutStore` tests are extended to assert `startSession` and `endSession` emit the correct `upsertSession` call on a mocked `syncEngine`. Existing behavioural tests still pass.
- [ ] The active-session screen and History tab continue to render correctly; the transitional hydration path (sessions from `syncEngine`, exercises/sets from `persistence`) is functionally invisible to the user.
- [ ] `npm test` and `npm run typecheck` pass.

## Blocked by

- [#18 Slice 3: Sync infrastructure with `user_settings` tracer](https://github.com/Cmac2712/stronger/issues/18) — needs the `mutationQueue`, `reconciler`, `localMirror`, and `syncEngine` skeleton.
