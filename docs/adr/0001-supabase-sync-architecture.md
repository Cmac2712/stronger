# Supabase sync architecture: offline-first, per-row LWW, hand-rolled queue

We're adding Supabase to persist workout data across devices for a single user. The design is offline-first with the local AsyncStorage mirror as the write-back cache the UI talks to, Supabase as the canonical multi-device state, and a hand-rolled FIFO mutation queue draining local writes to the server. Conflicts resolve by row-level last-write-wins on a client-set `updated_at`. Deletes are tombstones (`deleted_at`) so they reconcile under the same rule as edits. We chose hand-rolled over TanStack Query because the app has no other server-state caching needs, and against realtime subscriptions because pull-on-foreground covers the realistic single-user multi-device scenario at a fraction of the complexity. The schema is relational (`sessions`, `session_exercises`, `sets`, `user_settings`) keyed by client-generated UUIDs, with `enable row level security` and `user_id = auth.uid()` policies on every table. `schemaVersion` is retired; Postgres column migrations and tolerant client deserialisation replace it.

## Considered options

- **JSON blob in a single row per user.** Cheapest to ship — `saveState` becomes one upsert — but whole-blob LWW means a stale device that ends a workout clobbers a freshly-logged set from the other device. Rejected.
- **Server-set `updated_at`.** Simpler conceptually, but inverts offline correctness: a set logged at 18:42 in the gym uploading at 21:00 would lose to any 19:30 edit on another device. Rejected.
- **Field-level merge (CRDT-style).** Strictly safer for concurrent same-row edits, but the scenario it solves is vanishingly rare for one user. Rejected.
- **TanStack Query with offline persistence.** Powerful, but built around query/cache/invalidate that we're not otherwise using; Zustand owns UI state. Carrying the dependency for one sub-feature works against its grain. Rejected.
- **PowerSync / Replicache.** Architecturally correct for this exact problem, but introduces its own backend service alongside Supabase. Overkill for a personal tracker. Rejected.
- **Realtime subscriptions now.** Cleaner end-state, but the felt benefit (live iPad mirroring while logging on phone) doesn't match the actual use pattern (gym phone, couch iPad — never both active). Deferred without regret: adding realtime later is a pure addition under the same LWW rules.

## Consequences

- The persistence module API breaks the PRD's literal "store interface stays identical" promise. UI ↔ store stays identical; store ↔ persistence becomes granular ops (`upsertSet`, `tombstoneSet`, `upsertSession`, `setUserSetting`) rather than `saveState(blob)`. The store's action handlers stamp `updated_at = Date.now()` and call the appropriate op.
- The local mirror shape diverges from `PersistedState`: the mirror retains tombstones and `updated_at`/`deleted_at` columns; `PersistedState` (the view exposed to UI) filters tombstones out.
- A 4xx response on queue drain (RLS denial, expired auth) pauses the queue and surfaces to the user, rather than retrying forever. Network/5xx errors retry with exponential backoff.
- First sign-in on a device with existing Slice-0 AsyncStorage data has no special code path: the standard reconciliation upserts every local row to Supabase with `updated_at = Date.now()` (sign-in time), and pulls any remote rows it doesn't have.
- Tombstones live forever in both the mirror and Supabase. Garbage collection is a future concern; at the volume of one user logging ~500 sets/year it doesn't matter for the foreseeable future.
