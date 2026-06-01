# Slice 3: Sync infrastructure with `user_settings` tracer

## Parent

[#15 PRD: Slice 2 — Supabase sync and multi-device persistence](https://github.com/Cmac2712/stronger/issues/15)

Supporting docs: [CONTEXT.md](CONTEXT.md), [docs/adr/0001-supabase-sync-architecture.md](docs/adr/0001-supabase-sync-architecture.md).

## What to build

Build the entire sync stack — `mutationQueue`, `reconciler`, `localMirror`, `syncEngine` — and prove it end-to-end on the simplest possible row: `user_settings`, one row per user holding `rest_duration_ms`. After this slice, changing the rest duration on one device causes it to appear on another device after sign-in/foreground. Workout data (sessions, exercises, sets) still flows through the old `persistence` module — those tables are added in slices 4-6.

User-facing behaviour after merge:

- Signing in on a device triggers a pull: if Supabase has a `rest_duration_ms` value for this user, the local rest duration adopts it.
- Changing the rest duration in the app writes to `user_settings` on Supabase in the background, with no UI wait.
- Foregrounding the app triggers a pull.
- An expired session (401) on a queue write pauses the queue and surfaces a non-blocking "Sync paused — please sign in again" banner. Tapping it routes to the sign-in screen. After re-auth the queue resumes; no pending mutations are lost.
- Offline changes to rest duration accumulate in the queue and drain when online.

Internal shape:

- **`mutationQueue`** (deep, new): FIFO over its own AsyncStorage key (`workout/sync-queue/v1`). Public ops: `enqueue(mutation)`, `drain(handler)`, `pause()`, `resume()`, `peek()`. Handler-error classification: network/5xx → exponential backoff retry; 4xx → pause and surface. No Supabase dependency — takes the handler as a function.
- **`reconciler`** (deep, new): pure function. Given `(localRows, remoteRows)` returns `{ writes: Row[], enqueues: Row[] }`. No I/O.
- **`localMirror`** (new): typed wrapper around AsyncStorage for `user_settings`. Stores the row with `updated_at` and `deleted_at`. Exposes `loadUserSettings()` returning the filtered (non-tombstoned) value.
- **`syncEngine`** (new): composes the three above plus the Supabase client. Public API in this slice:
  - `setUserSetting(restDurationMs: number)` — stamps `updated_at`, writes mirror, enqueues upload.
  - `loadUserSettings()` — returns the current local-mirror view.
  - `pull()` — fetches `user_settings` rows updated since `last_pulled_at`, runs the reconciler, applies writes/enqueues.
  - `signIn(email, password)`, `signUp(email, password)`, `signOut()` — wrap the Supabase calls and trigger an initial `pull()` on successful sign-in. (`signUp` exists as a no-op pass-through in this slice if slice 2 hasn't landed yet; if slice 2 has landed, it stays the same wrapper — the in-app sign-up flow from slice 2 should call this method rather than `supabase.auth.signUp` directly so the engine can hook in.)
  - `onAuthStateChanged(callback)` — re-exposes Supabase's auth listener for the auth gate.
- A new Postgres migration (under `supabase/migrations/`) creates `user_settings`:
  ```sql
  create table user_settings (
    user_id uuid primary key references auth.users(id) on delete cascade,
    rest_duration_ms int not null,
    updated_at timestamptz not null,
    deleted_at timestamptz
  );
  alter table user_settings enable row level security;
  create policy "own row read"   on user_settings for select using (user_id = auth.uid());
  create policy "own row insert" on user_settings for insert with check (user_id = auth.uid());
  create policy "own row update" on user_settings for update using (user_id = auth.uid()) with check (user_id = auth.uid());
  create policy "own row delete" on user_settings for delete using (user_id = auth.uid());
  ```
  (Snippet above is the canonical shape; copy verbatim. `user_id` is both the primary key and the FK — there is exactly one settings row per user.)
- `workoutStore.setRestDuration` is refactored to call `syncEngine.setUserSetting` instead of (or in addition to, until slice 6 retires it) calling `persistence.saveState`. The rest of `workoutStore` continues to call `persistence.saveState` for now.
- App boot wires up: hydrate from `localMirror.loadUserSettings()` before the UI renders; subscribe to `onAuthStateChanged` to drive the auth gate; register a foreground listener that calls `syncEngine.pull()`.

## Acceptance criteria

- [ ] `mutationQueue` exists with the public interface described above; persists to AsyncStorage; survives app restart; tests cover FIFO ordering, transient-error retry/backoff, 4xx pause, idempotent drain.
- [ ] `reconciler` exists as a pure function; tests cover seed, hydrate, local-newer, remote-newer, tombstone-vs-edit (both directions), three-way merge, and the equal-`updated_at` tiebreak (remote wins).
- [ ] `localMirror` exists with typed read/write for `user_settings`.
- [ ] `syncEngine` exposes the API listed above and is the only module that imports the Supabase client for data ops.
- [ ] A Supabase migration creates `user_settings` with RLS + four `user_id = auth.uid()` policies as specified.
- [ ] `workoutStore.setRestDuration` calls `syncEngine.setUserSetting`; the existing UI behaviour for rest duration is unchanged.
- [ ] On app boot, the local rest duration value hydrates from `localMirror.loadUserSettings()` before the UI renders.
- [ ] On successful sign-in, an initial `pull()` runs and adopts any remote `rest_duration_ms` value.
- [ ] On app foreground (after first launch), `pull()` runs.
- [ ] A 401 from the queue drain handler pauses the queue and surfaces a non-blocking "Sync paused — please sign in again" banner. After re-auth, the queue resumes; previously-pending mutations are still in the queue and drain successfully.
- [ ] Demoable cross-device: change rest duration on device A → foreground device B → device B's rest duration updates to A's value.
- [ ] Demoable offline: turn off network on device A, change rest duration → UI updates immediately → reconnect → value appears on Supabase and on device B after foreground.
- [ ] Existing local `restDurationMs` in AsyncStorage is preserved through the upgrade: on first sign-in, it seeds `user_settings` on Supabase (the standard reconciliation handles this — no special code path).
- [ ] **No regression** in workout data behaviour: sessions/exercises/sets continue to flow through the existing `persistence` module unchanged. All existing tests in [src/store/workoutStore.test.ts](src/store/workoutStore.test.ts) and [src/persistence/persistence.test.ts](src/persistence/persistence.test.ts) pass.
- [ ] `npm test` and `npm run typecheck` pass.

## Blocked by

- [#16 Slice 1: Supabase bootstrap + auth gate (sign-in only)](https://github.com/Cmac2712/stronger/issues/16) — needs the `supabaseClient`, env vars, and auth gate.

Can run in parallel with the sign-up/verification slice (2) — they share no code.
