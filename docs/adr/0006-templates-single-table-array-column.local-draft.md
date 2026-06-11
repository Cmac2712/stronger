# User templates: a single table with an ordered exercise-id array

We're adding workout **templates** (named, ordered lists of exercises — see [CONTEXT.md](../../CONTEXT.md)). Predefined templates are a hardcoded module and need no storage; only *user* templates persist. Unlike a `Session`, a user template is only ever created, replaced, or deleted **as a whole** — there is no per-exercise mutation against it. So we store each user template as a single synced row, `templates (id, user_id, name, exercise_ids text[] ordered, updated_at, deleted_at)`, reconciled by the existing per-row LWW with a client-set `updated_at` and tombstone deletes — identical machinery to `sessions`/`sets`, just one table instead of two. The ordered `exercise_ids` array is the template's exercise list; FK integrity is the client's responsibility (the ids resolve against the hardcoded exercise library, same as `session_exercises.exercise_id`).

## Considered options

- **Two normalized tables (`templates` + `template_exercises`), mirroring `sessions`/`session_exercises`.** Strictly consistent with the established pattern, but buys nothing here: the child table earns its keep only when individual children are edited independently (as `sets` and `session_exercises` are), and a template is never edited exercise-by-exercise. It would add a second mirror type, mutation builder, reconcile block, and a tombstone-cascade on delete — all to model a relationship that is always rewritten wholesale anyway. Rejected.
- **Whole-row array column (chosen).** Whole-template LWW is *correct* granularity here, not a shortcut: the row is the unit of edit. This is the opposite of the whole-state JSON-blob option rejected in [ADR-0001](./0001-supabase-sync-architecture.md) — that blob bundled independently-edited sets, so blob-LWW clobbered live data; a template bundles nothing that is edited independently of the template itself.

## Consequences

- Editing a saved template (if ever added) means re-upserting the whole row — acceptable, since the conflict unit is the whole template by design.
- The store gains a `templates: Template[]` field on `PersistedState`, hydrated from the mirror and written through the same mutation-callback → syncEngine → mirror+queue path as sessions. Predefined templates are merged in at read time from the hardcoded module and are never persisted.
- A template's `exercise_ids` can reference an exercise id that a future app version renames or removes; reads must tolerate an unresolved id (skip it), exactly as `session_exercises` must.
