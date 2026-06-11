## Parent

#39

## What to build

The data layer for **user templates** — derivation, store actions, and sync — with no new UI. Verified end-to-end through unit tests.

`templateFromSession` (pure): `Session → { name, exerciseIds }`. Selects the distinct exercise ids of session exercises that have ≥1 set, in first-appearance order, and derives a default name from the dominant muscle group(s) of those exercises via the exercise library (e.g. "Chest & Back"). No I/O.

`workoutStore` extension: add `templates: Template[]` (user templates only — builtin are merged at read time) to persisted state. New actions `saveTemplate({ name, exerciseIds })` and `deleteTemplate(id)` go through the same mutation-callback → syncEngine path as sessions, stamping `updated_at = Date.now()`. `getTemplates()` now merges builtin + user, each tagged with its `source`.

Template sync per ADR-0006: a new `templates` table (`id, user_id, name, exercise_ids text[] ordered, updated_at, deleted_at`; RLS `user_id = auth.uid()`), plus a migration, localMirror read/write for template rows, a `buildTemplateMutation`, `upsertTemplate`/`tombstoneTemplate` in the sync engine, a reconcile block in `pull()` reusing the generic per-row LWW, and a row↔`Template` mapping (analogue of `rowsToSessions`). Whole-row LWW is the conflict unit — templates are replaced or deleted wholesale, never edited per-exercise. Reads must tolerate an `exercise_ids` entry that no longer resolves in the library (skip it), exactly as session exercises do.

## Acceptance criteria

- [ ] `templateFromSession`: distinct ≥1-set exercises only, first-appearance order, zero-set exercises dropped, dominant-muscle-group default name; handles single-group and empty-session edge cases (table-driven test)
- [ ] `saveTemplate` adds to persisted `templates` and emits the upsert sync callback; `deleteTemplate` tombstones and emits (store-harness test, like `workoutStore.test.ts`)
- [ ] `getTemplates()` merges builtin + user with correct `source` markers
- [ ] New `templates` table migration with RLS; row↔`Template` round-trip mapping covered by a test
- [ ] Template rows reconcile under the existing per-row LWW (later `updated_at` wins; tombstone vs edit resolves per existing rules)
- [ ] A `Template` whose `exercise_ids` contains an unresolved id reads gracefully (the id is skipped, no crash)
- [ ] Save/delete work offline and drain through the existing mutation queue
- [ ] Green gate: typecheck + jest

## Blocked by

- #40 (`getTemplates()` merges with the builtin templates introduced there)
