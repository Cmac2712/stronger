## Parent

#39

## What to build

The **AI workout** generation core: two pure modules and the edge function, fully unit-tested against a mocked Anthropic client. Nothing is deployed and there is no UI in this slice.

`historySummary` (pure): `Session[] → { exerciseId, count, lastPerformedAt }[]` over exercises with ≥1 set — the compact "favour what you do" payload the client will later send.

`buildWorkoutRequest` (pure, shared with the edge function): `{ split, summary } → Claude request` (system prompt + structured-output schema). The response schema constrains `exerciseIds` to a JSON-schema `enum` of **every** exercise-library id, derived from `exerciseLibrary.getAll()` at build/call time (never hand-maintained), so FK integrity holds at generation time and adding a library exercise widens AI selection automatically.

`supabase/functions/generate-workout` (Deno + `@anthropic-ai/sdk`, stateless): request `{ split, summary }` from an authenticated client → `buildWorkoutRequest(...)` → `claude-haiku-4-5` with structured output → response `{ exerciseIds: string[] }` (guaranteed library ids) or an error status. Authenticates the caller via the Supabase JWT; `ANTHROPIC_API_KEY` is read from a Supabase secret.

Decide and document how `buildWorkoutRequest` is shared between the RN app (Metro/Jest, TS) and the Deno function (different runtime and import style) — this is the one non-obvious wrinkle in the slice.

## Acceptance criteria

- [ ] `historySummary`: correct `count` and `lastPerformedAt` per exercise; only exercises with ≥1 set; stable ordering (table-driven test)
- [ ] `buildWorkoutRequest`: the response schema's `exerciseIds` enum equals the full set of exercise-library ids; the prompt includes the split and the summary; adding a library exercise widens the enum (drift-guard test)
- [ ] The edge function, against a **mocked** Anthropic client, builds its request via `buildWorkoutRequest`, targets `claude-haiku-4-5`, and returns a well-formed `{ exerciseIds }`
- [ ] Auth failure and invalid `split` return the correct error status; no live network in tests
- [ ] The code-sharing approach for `buildWorkoutRequest` (app ↔ Deno function) is implemented and noted
- [ ] Green gate: typecheck + jest

## Blocked by

None - can start immediately
