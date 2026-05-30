# Stronger

A single-user workout tracker. The app's job is to make logging a working set faster than writing it on paper, and to make "what did I do last time?" a one-tap answer.

The domain is small but the language is precise: this glossary fixes the terms used in [PRD.md](./PRD.md), the codebase, and any future ADRs.

## Language

### Workout domain

**Session**:
One workout, bounded by an explicit start and end. A session is either *active* (in progress, `endedAt = null`) or *historical* (ended). There is at most one active session at a time.
_Avoid_: workout (use only as a synonym in user-facing copy; in code and docs use **session**).

**Session exercise**:
An exercise as it appears within a session — the join between a session and a library exercise, carrying its position in the session and its sets. Same library exercise repeated later in the same session is a *new* session exercise, not the same row revisited.
_Avoid_: workout exercise, exercise instance.

**Exercise**:
An entry in the curated exercise library (id, name, muscle group). The library is hardcoded; users don't add exercises.
_Avoid_: lift, movement (acceptable in user copy; **exercise** in code).

**Set**:
One performed effort of a session exercise: `reps` and `weight` in kg. All sets are working sets; warmups are not tracked.
_Avoid_: rep, working set (a set IS a working set here — no qualifier needed).

**Top set**:
The set within a session that has the highest weight. Ties broken by reps descending, then by `setNumber` descending. Drives the per-exercise sparkline.
_Avoid_: best set, heaviest set.

### Sync and persistence

**Mutation**:
A single user-initiated change to workout state — log a set, edit a set, delete a set, add an exercise, end a session, change rest duration. Mutations are the unit of sync: each mutation produces one row write to the local mirror and one entry on the mutation queue.

**Local mirror**:
The on-device AsyncStorage representation of the user's data. UI reads exclusively from the local mirror; mutations write to it synchronously. The mirror shape matches the remote schema row-for-row, including tombstones — it is *not* the same as `PersistedState`, which is the filtered view the store exposes to the UI.
_Avoid_: cache (technically accurate but conflates with "read-through cache" — this is a write-back mirror).

**Canonical state**:
The Supabase tables. Authoritative across devices; not authoritative against a local mutation that hasn't synced yet. Per-row LWW reconciles the two.
_Avoid_: remote state, server state (acceptable casually; **canonical state** in docs).

**Sync**:
The process of converging local mirror and canonical state. Bidirectional and eventual: writes flow local → canonical via the mutation queue; reads flow canonical → local via reconciliation on app launch and foreground.

**Mutation queue**:
A FIFO list of pending mutations stored under its own AsyncStorage key. Drains in order against Supabase whenever the device is online; survives app restarts and OS kills.
_Avoid_: outbox, write buffer.

**Reconciliation**:
The merge step that runs on every pull (app launch, foreground). For each remote row, compare `updated_at` against the local mirror and overwrite the older side. Tombstones (`deleted_at IS NOT NULL`) follow the same rule — a later tombstone deletes; a later edit resurrects. Single algorithm covers seed, hydrate, and merge scenarios.

**Tombstone**:
A row marked deleted via `deleted_at`, rather than physically removed. Tombstones travel through sync like any other row; the local mirror retains them so subsequent reconciliations agree on the deletion. UI reads filter `deleted_at IS NOT NULL` out before exposing state.
_Avoid_: deleted row (ambiguous — could mean a hard-deleted row).

**`updated_at`**:
A client-set timestamp stamped at the moment of the mutation, in epoch ms. Governs LWW comparisons. Never overwritten by the server. Set by `Date.now()` in the store action that produces the mutation.

**Last-write-wins (LWW)**:
The conflict resolution policy: when two devices have edited the same row, the one with the higher `updated_at` wins wholesale. Row-level, not field-level. Applies uniformly to inserts, updates, and tombstone deletes.

## Flagged ambiguities

**"Private to my device" (PRD User Story #29)**:
This phrasing was correct in Slice 0 (AsyncStorage only). With Supabase, data leaves the device and lives in a row tied to the user's account. The accurate replacement is **"private to my account"** — still single-user, still no sharing, but no longer device-local. Update the PRD when Slice 2 ships; until then read US #29 as "private to my account."

## Example dialogue

> **Dev:** I just logged a set in the gym but the app was offline. What happens?
>
> **You:** The store writes to the **local mirror** synchronously, so you see the set in the UI immediately. It also appends to the **mutation queue** as an `upsertSet` mutation, with `updated_at = Date.now()`.
>
> **Dev:** And when I get back on wifi?
>
> **You:** The queue drains. Each mutation hits Supabase as an upsert against the **canonical state**. Because we use per-row **LWW** with client-set `updated_at`, even if your iPad also edited that **set** while you were offline, whichever edit has the higher timestamp wins.
>
> **Dev:** What if I deleted a set offline and edited it on the iPad?
>
> **You:** The delete creates a **tombstone** on the local mirror — `deleted_at` set, row stays in the mirror but filtered out of UI reads. Queue pushes the tombstone. **Reconciliation** on the iPad later pulls the tombstone in. If the iPad's edit has a higher `updated_at` than your tombstone, the row comes back alive on both devices. If the tombstone is later, it stays deleted.
>
> **Dev:** So I can't lose data by being offline?
>
> **You:** You can't lose data by being offline. You *can* clobber an older edit with a newer one — that's what LWW means. For a single human across their own devices, this is fine; we explicitly chose against field-level merging.
