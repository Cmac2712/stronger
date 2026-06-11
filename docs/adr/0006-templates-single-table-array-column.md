# Templates storage: a single table with an ordered array column, whole-row LWW

User templates (PRD #39) are a named, ordered list of library exercise ids — no sets, no targets. They sync through one new table:

```
templates ( id uuid pk, user_id uuid, name text,
            exercise_ids text[],  -- ordered
            updated_at timestamptz, deleted_at timestamptz )  -- RLS: user_id = auth.uid()
```

`exercise_ids` is an ordered Postgres `text[]` rather than a child table. The whole row is the conflict unit under the existing per-row LWW rules (ADR-0001): a template is created whole (save-from-workout), replaced whole, or tombstoned whole — there is no per-exercise edit anywhere in the product (editing a template is explicitly out of scope in the PRD), so there is nothing for row-per-exercise granularity to protect. The sync plumbing is the same four pieces every synced table gets: a localMirror key, a mutation builder, upsert/tombstone ops in the syncEngine, and a reconcile block in `pull()` reusing the generic `reconcile`.

The in-memory `Template` (`{ id, name, exerciseIds }`) lives in `@shared/types` because `PersistedState` carries user templates; builtin templates stay hardcoded in `templateLibrary` and are merged (tagged `source: "builtin" | "user"`) at read time by `workoutStore.getTemplates()`. The row↔domain mapping is `templateToRow`/`rowsToTemplates` in the syncEngine — the analogue of `rowsToSessions`, minus the stitching, since there are no child rows to stitch.

An `exercise_ids` entry that no longer resolves in the exercise library is skipped at read time (`getTemplates()` filters through `exerciseLibrary.getById`), so an old template referencing a removed exercise renders and applies gracefully (US #38). The stored row keeps the raw ids — skipping is a view concern, and dropping ids at the storage layer would silently rewrite the user's data.

## Considered options

- **Child table (`template_exercises`), mirroring `session_exercises`.** The structurally consistent choice, but it buys conflict granularity for an entity that is never edited per-exercise, at the cost of a second table, a second mutation type, ordering by an `order` column, and stitching in `rowsToTemplates`. Sessions need that machinery because sets are logged one at a time into an existing session; templates never mutate incrementally. Rejected.
- **JSON blob column (`jsonb`).** Equivalent write semantics to `text[]`, but weaker typing and nothing gained — the payload is a flat string list. `text[]` states the shape in the schema. Rejected.
- **Normalised FK to an `exercises` table.** There is no `exercises` table; the library is hardcoded app-side (ADR-0001 schema). A DB-level FK would require shipping and migrating library content to Postgres for no integrity gain the client read-path doesn't already provide. Rejected.
- **Field-level merge on `name` vs `exercise_ids`.** The only theoretical loss under whole-row LWW is a concurrent rename on one device vs delete/re-save on another — vanishingly rare for a single user, and the resolution (latest wins wholesale) is what a user would predict. Rejected, consistent with ADR-0001.

## Consequences

- Saving a template that already exists by content creates a new row — ids are minted per save, and dedup is the user's concern (delete the old one). No uniqueness constraint on `name`.
- A future "edit template" feature would force this decision open again: per-exercise edits under whole-row LWW can clobber concurrent edits to other positions in the array. The PRD deliberately scopes editing out; re-save-from-workout is the replacement flow.
- Tombstones live forever, same as every other synced table (ADR-0001).
- `getTemplates()` filtering means a template's visible exercise count can be lower than its stored list; if the library ever re-adds an id, the template heals automatically.
