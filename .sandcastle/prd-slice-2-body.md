# PRD: Slice 2 — Supabase sync and multi-device persistence

**Triage label:** `ready-for-agent`

## Problem Statement

I've been logging sessions in Slice 0 with AsyncStorage as the only home for my data. That worked for proving the UX, but it's brittle: if my phone is lost, wiped, or its data corrupted, every session I've ever logged is gone — there's no other copy anywhere. I also can't open the app on a second device (a tablet at home, a replacement phone after an upgrade) and see my history, because the data physically lives on the one phone.

I want my workout data to outlive any single device, and I want to be able to pick up a tablet on the couch and see what I did at the gym this morning. But I don't want any of that to slow down the in-gym experience — the offline-first feel of Slice 0 (instant taps, no spinners, works in a basement with no signal) is the bar. A backend that makes me wait on the network between sets is worse than no backend at all.

## Solution

Add Supabase as the **canonical state** for my workout data, with AsyncStorage demoted to a **local mirror** that the UI talks to. Writes go to the local mirror synchronously (UI sees them instantly) and onto a **mutation queue** that drains to Supabase in the background. On app launch and foreground, the device pulls remote changes and runs **reconciliation** to merge them into the local mirror. Conflicts resolve by row-level **last-write-wins** on a client-set `updated_at` timestamp; deletes become **tombstones** so they sync the same way as edits.

Auth is email/password with an in-app sign-up flow and email verification on (via a custom deep-link redirect). My existing Slice-0 AsyncStorage data seeds Supabase automatically on first sign-in — no import step, no migration script, just the standard reconciliation algorithm running against a remote that happens to be empty.

The PRD's earlier promise that *"the persistence module is the only place that needs to change — the store interface stays identical"* holds at the UI ↔ store boundary. Internally, the store-to-persistence boundary evolves from a single `saveState(blob)` call to a set of granular mutation ops, because per-row LWW needs to know which row changed.

Vocabulary used throughout this PRD — *session*, *session exercise*, *mutation*, *local mirror*, *canonical state*, *sync*, *mutation queue*, *reconciliation*, *tombstone*, *`updated_at`*, *LWW* — is defined in [CONTEXT.md](CONTEXT.md). Two ADRs back this PRD: [ADR-0001 (sync architecture)](docs/adr/0001-supabase-sync-architecture.md) and [ADR-0002 (auth)](docs/adr/0002-email-password-auth-with-verification.md). Anything in this PRD that contradicts those ADRs is a bug in the PRD.

## User Stories

### Account and auth

1. As a lifter, I want to create an account with email and password from inside the app, so that I can start using sync without leaving the app.
2. As a lifter, I want to receive a verification email after sign-up, so that typo'd email addresses don't end up locked out of their account.
3. As a lifter, I want to tap the verification link in my email and land directly back in the app already signed in, so that the verification step doesn't make me re-enter my password.
4. As a lifter, I want to sign in with email and password on a new device, so that I can pick up my history wherever I install the app.
5. As a lifter, I want to stay signed in across app launches, so that I don't have to re-authenticate every time I open the app.
6. As a lifter, I want to sign out, so that I can hand the device to someone else without exposing my data.
7. As a lifter, I want a clear, non-destructive error state when my session expires or my credentials become invalid, so that I can sign in again without losing pending writes.
8. As a lifter, I want the auth flow to gate the rest of the app (Workout / History tabs), so that I can't accidentally log a workout into nowhere while signed out.

### Logging and offline-first

9. As a lifter, I want every set I log to appear in the UI instantly, so that the gym experience stays as fast as it was in Slice 0.
10. As a lifter, I want to log a complete workout with no network connection, so that a basement gym or poor signal doesn't stop me logging.
11. As a lifter, I want my offline writes to upload automatically when I'm back online, so that I never have to manually trigger a sync.
12. As a lifter, I want edits and deletes I make offline to sync with the same correctness as set logs, so that no kind of change is left behind.
13. As a lifter, I want my mutation queue to survive the app being killed by the OS, so that an interrupted session uploads when the app is next opened.
14. As a lifter, I want my data to keep working locally even if Supabase is completely down, so that an outside outage doesn't stop me logging.

### Cross-device

15. As a lifter, I want to open the app on a second device and see my full history, so that I'm not locked to a single phone.
16. As a lifter, I want changes made on one device to appear on the other when the other foregrounds, so that I see consistent state across devices without needing to do anything.
17. As a lifter, I want to log a set on my phone in the gym, walk home, open the iPad, and see today's workout there, so that the multi-device promise is real and not theoretical.
18. As a lifter, I want concurrent edits to the same set across two devices to resolve deterministically (the later edit wins), so that I don't end up with mysterious half-merges.
19. As a lifter, I want a delete to win over an earlier edit, and an edit to win over an earlier delete (resurrection), so that the semantics match my intuition without my having to think about it.
20. As a lifter, I want all of my existing Slice-0 sessions to appear in Supabase the first time I sign in, so that I don't lose anything by adopting the backend.
21. As a lifter, I want a fresh install on a new device to populate with my full history after sign-in, so that "new device" means "new device, same data."

### Privacy and access

22. As a lifter, I want my data to be readable only by my account, so that even if someone else has the app and signs up they can't see my sessions.
23. As a lifter, I want my account creation to fail if the email is already in use, so that I don't accidentally fork my data into a duplicate account.
24. As a lifter, I want the privacy posture to be "private to my account" rather than the old "private to my device", so that I understand what trust I'm extending to Supabase.

### Maintenance and evolution

25. As a developer-user of the app, I want schema changes to ship as Postgres migrations rather than client-side version negotiation, so that adding a new column doesn't require a coordinated client update.
26. As a developer-user of the app, I want older app versions to tolerate unknown columns from a newer database, so that I can roll out schema changes ahead of client releases without breaking installed apps.

## Implementation Decisions

### Goal and shape

- **Single user, multi-device.** Auth exists for identity portability across devices, not for multi-tenancy, social, or coaching scenarios.
- **Canonical state = Supabase; local mirror = AsyncStorage.** UI reads exclusively from the local mirror. Writes go to the local mirror synchronously then onto the mutation queue.
- **Offline-first.** The app never waits on a network round-trip to update the UI. Sync happens behind the UI.

### Schema

- **Relational tables**, not a JSON blob: `sessions`, `session_exercises`, `sets`, `user_settings`.
- **Client-generated UUIDs** as primary keys (the existing `genId()` outputs become the row ids; no server-generated ids).
- Every row has `user_id` (FK to `auth.users`), `updated_at` (timestamptz, set by the client at mutation time), `deleted_at` (timestamptz, nullable; non-null = tombstone).
- Every table has `enable row level security` plus four policies (`select`, `insert`, `update`, `delete`), each gated on `user_id = auth.uid()`.
- `user_settings` is one row per user holding `rest_duration_ms` (and a forward-compat space for any future single-valued user preferences). The `restTimer` ephemeral state remains in-memory and is **not** persisted or synced.
- `schemaVersion` is **retired** from `PersistedState`. Schema evolution is handled by Postgres migrations (under `supabase/migrations/`) plus tolerant client deserialisation: unknown columns are ignored on read; missing columns on read return `undefined` and the client falls back to defaults.

The schema for `sets` looks like:

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
create policy "own sets read"   on sets for select using (user_id = auth.uid());
create policy "own sets insert" on sets for insert with check (user_id = auth.uid());
create policy "own sets update" on sets for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own sets delete" on sets for delete using (user_id = auth.uid());
```

`sessions`, `session_exercises`, and `user_settings` follow the same pattern (own columns + `user_id` + `updated_at` + `deleted_at` where deletable + RLS + four policies). The `session_exercises` table also stores its `order` field. (Snippet above came from the design conversation; full set of tables follows the same template.)

### Conflict resolution

- **Client-set `updated_at`** (epoch ms via `Date.now()` in the store action that produces the mutation). Server stores it verbatim; never overridden.
- **Row-level LWW** — whichever row has the higher `updated_at` wins wholesale. No field-level merge.
- **Deletes are tombstones** — `deleteSet` writes `deleted_at = updated_at = Date.now()`. UI reads filter `deleted_at IS NOT NULL` out before exposing state to the store/UI.
- Tombstones live forever in the mirror and in Supabase. No garbage collection for the foreseeable future.

### Sync model

- **Mutation queue** is a FIFO list of pending mutations under a dedicated AsyncStorage key (`workout/sync-queue/v1`). Each entry: `{ id, kind, payload, enqueuedAt }`. Must persist across app restarts.
- **Drain triggers**: on every enqueue, on app foreground, on network-online events.
- **Retry strategy**: network / 5xx → exponential backoff, retry indefinitely. 4xx (RLS denial, expired auth, malformed payload) → **pause the queue** and surface a non-destructive "sync paused — please sign in again" state to the user. Never silently retry a 4xx forever.
- **No coalescing.** 50 edits to the same row offline = 50 upserts when the queue drains. Per-row LWW makes this correct; the bandwidth waste is acceptable at this app's scale.

### Reconciliation

- Single algorithm covers seed, hydrate, and merge. Runs on sign-in and on every subsequent pull.
- Steps: pull rows where `updated_at > last_pulled_at` for the user. For each remote row, if absent locally or local is older, write to local mirror. For each local row absent remotely or newer than remote, enqueue an upsert. Persist `max(updated_at)` seen as `last_pulled_at`.
- **First sign-in with existing local data** is not a special case — the standard algorithm seeds the local rows up to Supabase (every local row has no remote counterpart). Local rows are stamped `updated_at = Date.now()` (sign-in time) at seed.
- **Tombstone handling on pull**: remote rows with `deleted_at` set are written to the local mirror unchanged so subsequent reconciliations agree on the deletion. UI reads filter them out.

### Cross-device freshness

- **Pull-on-launch and pull-on-foreground only.** No realtime subscriptions, no polling.
- Realtime is a deferred-without-regret addition: the same LWW reconciliation rules apply to a subscription payload as to a pull, so adding it later is purely additive. Skip for this slice.

### Auth

- **Email/password.** No OAuth, no magic link, no anonymous auth.
- **In-app sign-up flow.** Sign-up screen + sign-in screen + "verify your email" instructional screen.
- **Email verification ON** (Supabase default). User signs up → receives email → taps link → returns to app already signed in.
- **Custom deep-link redirect**: scheme `stronger://`, configured in [app.json](app.json), handled via `expo-linking` + `supabase.auth.exchangeCodeForSession`. The Supabase project's redirect URL allowlist must include both the dev scheme (`exp+stronger://`) and the prod scheme (`stronger://`).
- **Session persistence** via Supabase's storage adapter pointed at AsyncStorage. Sessions survive app launches.
- **Auth gate** on the navigator: signed-out → auth flow; signed-in → main tabs.
- **Sign-up is open**: anyone with the Supabase project URL can create an account. RLS scopes them to their own rows. Acceptable for this slice; revisit if junk accounts become a problem.

### Module structure

- **`mutationQueue`** (NEW, deep): FIFO over AsyncStorage. Public ops: `enqueue(mutation)`, `drain(handler)`, `pause()`, `resume()`, `peek()`. No Supabase dependency — takes a handler function. Owns retry/backoff/pause behaviour.
- **`reconciler`** (NEW, deep, pure function): given `(localRows, remoteRows)` returns `(rowsToWriteToLocal, rowsToEnqueueForUpload)`. No I/O, no time, no network — fully exercisable in a unit test.
- **`localMirror`** (NEW): typed wrapper around AsyncStorage for the row-shaped tables. Stores rows with `updated_at`/`deleted_at`. Exposes a `loadState()` that filters tombstones into the UI-facing `PersistedState` shape.
- **`syncEngine`** (NEW): composes `mutationQueue` + `reconciler` + `localMirror` + Supabase client. Public API the store and UI call:
  - Granular mutation ops: `upsertSet`, `tombstoneSet`, `upsertSession`, `tombstoneSession`, `upsertSessionExercise`, `tombstoneSessionExercise`, `setUserSetting`. Each stamps `updated_at`, writes to local mirror, enqueues for upload.
  - Auth: `signIn(email, password)`, `signUp(email, password)`, `signOut()`, `onAuthStateChanged(callback)`.
  - Lifecycle: `pull()` (manual trigger for foreground), `loadState()` (UI hydration).
- **`supabaseClient`** (NEW): single configured instance, storage adapter pointed at AsyncStorage. Pure config.
- **Auth screens** (NEW): sign-in, sign-up, "verify your email" instructional. Two inputs + a button each.
- **Deep-link handler** (NEW): `expo-linking` listener for `stronger://auth/callback` → `supabase.auth.exchangeCodeForSession`.
- **Supabase migrations** (NEW): SQL files under `supabase/migrations/` creating tables + RLS policies.
- **`workoutStore`** (MODIFY): action handlers stop snapshot-and-saveState and call granular ops on `syncEngine`. UI-facing interface stays identical (every selector and action signature is unchanged).
- **`persistence`** (RETIRE): replaced by `localMirror` + `syncEngine`.
- **`types`** (MODIFY): drop `SCHEMA_VERSION`. `PersistedState` keeps its shape (the UI-facing filtered view). Add a Mirror-row shape internal to `syncEngine`/`localMirror`.
- **App shell** (MODIFY): wrap the navigator in an auth gate.

### UI surface

- The UI does **not** show a "syncing..." spinner, queue depth, or per-row sync status. Offline-first means silence in the happy path.
- The **one** UI state for sync is the auth-paused banner: if the queue paused on a 4xx, the user sees a non-blocking message ("Sync paused — please sign in again") with a tap to re-auth. Pending mutations are not lost.
- Auth screens (sign-in, sign-up, verify) are new and shallow — primitive RN components + NativeWind, same style as the rest of the app.

### Environment configuration

- Supabase URL and anon key live in `.env` (already gitignored). Read via `expo-constants` `extra` field exposed in [app.json](app.json).
- Two Supabase projects acceptable (dev / prod) but a single project is fine for this slice — there is one user.

## Testing Decisions

### Philosophy

Tests target the **public interface of deep modules**, the same standard set in [PRD.md](PRD.md) for Slice 0. Behaviour, not implementation. A test must survive a refactor that doesn't change behaviour.

We do **not** unit-test:
- UI screens (shallow by design; manual verification in the gym is the right test).
- `supabaseClient` (config only).
- `localMirror` (a thin typed wrapper over AsyncStorage; the value of testing forwarding is low).
- `syncEngine` end-to-end (composition layer — its pieces are covered).
- Deep-link handling (manual verification — sign up, tap email link, observe app foregrounds signed in).

We **do** unit-test:

### Modules under test

**1. `mutationQueue`**

Drive it through its public interface; assert observable state via `peek()` and via the handler-call log.

Representative scenarios:
- `enqueue` then `drain` invokes the handler once per mutation in FIFO order.
- A handler that throws a transient (network/5xx) error causes the queue to retry with backoff and eventually drain when the handler stops throwing.
- A handler that throws a 4xx-classified error causes the queue to **pause**; subsequent `enqueue` calls add to the queue but don't drain; `resume` resumes draining from the head.
- A drained mutation does not re-fire if `drain` is invoked again.
- Queue contents survive a simulated restart (construct a fresh queue instance against the same AsyncStorage and observe the same pending items).
- Drain is idempotent and safe to call while a drain is already in progress (no double-fire of the handler for the same mutation).

**2. `reconciler`**

Pure function; table-driven tests. Each case is `(localRows, remoteRows) → (writes, enqueues)`.

Representative scenarios:
- **Seed (local-only):** local has rows, remote is empty → every local row is enqueued for upload; no writes to local.
- **Hydrate (remote-only):** local is empty, remote has rows → every remote row is written to local; nothing is enqueued.
- **Local newer:** same id, local `updated_at > remote` → no write to local, row is enqueued for upload (so the server learns).
- **Remote newer:** same id, remote `updated_at > local` → remote row is written to local; no enqueue.
- **Tombstone vs edit (tombstone newer):** local edit, remote tombstone with higher `updated_at` → tombstone is written to local; row vanishes from UI reads.
- **Edit vs tombstone (edit newer):** local tombstone, remote edit with higher `updated_at` → remote edit overwrites local; row resurrects.
- **Three-way merge:** local has rows A, B; remote has rows B (newer), C → A enqueued for upload, B's remote version written to local, C written to local.
- **Identical timestamps tiebreak:** spec the tie behaviour (recommended: remote wins on equal `updated_at`, to favour convergence).

**3. `workoutStore`** (existing tests stay; add the granular-op assertions)

Keep all current black-box behavioural tests intact ([src/store/workoutStore.test.ts](src/store/workoutStore.test.ts)). Add:

- Each store action emits the correct granular op on a mocked `syncEngine`. E.g. `logSet` results in one `upsertSet` call with the correct row; `deleteSet` results in one `tombstoneSet` call.
- The mocked `syncEngine` is injected the same way the existing `persist` callback is today, preserving the testability seam.

### Prior art

- The existing [src/store/workoutStore.test.ts](src/store/workoutStore.test.ts) is the model for `workoutStore`'s extended tests — black-box behavioural, drive through the public interface, assert observable state. Follow that style.
- The existing [src/persistence/persistence.test.ts](src/persistence/persistence.test.ts) is the model for storage-touching tests — mock AsyncStorage, round-trip values, assert behaviour. `mutationQueue` tests should follow that style for the persistence side, but layer in handler-mock assertions for the drain semantics.

## Out of Scope

The following are explicitly **not** part of this slice. They are noted so reviewers don't suggest them as gaps:

- **Realtime subscriptions / WebSocket push.** Pull-on-launch and pull-on-foreground are the only cross-device freshness mechanisms. Realtime is a future addition; the LWW model accommodates it without changes.
- **OAuth providers (Google/Apple/etc.).** Email/password only.
- **Magic-link auth.** Considered and rejected — see [ADR-0002](docs/adr/0002-email-password-auth-with-verification.md).
- **Anonymous auth.** Considered and rejected — breaks multi-device. See [ADR-0002](docs/adr/0002-email-password-auth-with-verification.md).
- **Password reset / forgot-password flow.** Not in scope for this slice; if the developer-user forgets their password, reset via Supabase dashboard. Revisit if a second user is onboarded.
- **In-app account deletion.** Not in scope. Account deletion goes via Supabase dashboard for now.
- **Field-level merge / CRDT.** Row-level LWW only. See [ADR-0001](docs/adr/0001-supabase-sync-architecture.md).
- **Mutation coalescing.** A queue with 50 edits to the same row drains 50 upserts. Correct (LWW), wasteful (bandwidth), acceptable (volume).
- **Tombstone garbage collection.** Tombstones live forever.
- **Realtime sync status UI.** No "syncing..." spinner, no queue-depth indicator. The only sync-related UI state is the auth-paused banner.
- **TanStack Query** (or any server-state caching library). Hand-rolled queue. See [ADR-0001](docs/adr/0001-supabase-sync-architecture.md).
- **PowerSync / Replicache / dedicated sync libraries.** Same as above.
- **Multiple Supabase projects (dev/prod separation) for this slice.** Single project is fine for one user; revisit if/when others join.
- **iOS, web, tablet form factors for the auth flow.** Android only, as with Slice 0.
- **The "import from another tracker" story.** Existing Slice-0 data seeds via the standard reconciliation; data from Strong/Hevy/Jefit/spreadsheets is out of scope.
- **`schemaVersion` migrations** in client code. Postgres column migrations + tolerant deserialisation replace it. The existing `persistence.test.ts` scenario that asserts "loadState returns null on unknown schemaVersion" becomes obsolete and is removed alongside the `persistence` module.

## Further Notes

**Why offline-first and not online-first.** The PRD's UX bar from Slice 0 — "if logging a set takes more than two or three taps, I'll stop doing it" — is the constraint. Any model where the UI waits for Supabase to ack a write before showing the set fails that bar on bad gym wifi. Offline-first is the only model where the user-visible latency of a set log is the same online and offline. The trade-off (eventual consistency rather than strong) is acceptable for a single user across their own devices.

**Why hand-rolled and not TanStack Query.** Documented in [ADR-0001](docs/adr/0001-supabase-sync-architecture.md). Short version: TanStack Query's core (query/cache/invalidate) isn't being used by the rest of the app, so we'd be importing a framework for one sub-feature and working against its grain.

**Why verification ON despite the developer-user being the only user.** Documented in [ADR-0002](docs/adr/0002-email-password-auth-with-verification.md). Recording it on the PRD so the deep-link plumbing doesn't get "cleaned up" later by a reader who assumes verification is off.

**Privacy posture change.** Slice-0 user story #29 said "private to my device." This slice changes that to "private to my account": still single-user, still no sharing, but the data now lives on Supabase's servers under a `user_id`-scoped row, protected by RLS. The phrasing in [CONTEXT.md](CONTEXT.md) under "Flagged ambiguities" is the canonical replacement.

**Why no special first-sign-in code path.** The reconciliation algorithm — pull, write-newer-to-local, enqueue-newer-to-upload — already handles the seed case (everything is local-only → everything gets enqueued) and the hydrate case (everything is remote-only → everything gets written to local) and the merge case (intersection by id, LWW on overlap). Special-casing first sign-in would mean two code paths converging on the same behaviour. One algorithm is fewer bugs.

**What "the store interface stays identical" means in practice.** The UI-facing interface of `workoutStore` (every selector, every action, every type) is unchanged. The store-to-persistence boundary changes: action handlers now call granular ops on `syncEngine` instead of computing snapshots for `saveState`. The PRD's original promise lives at the boundary that actually matters (UI ↔ store); the smaller internal boundary evolves.
