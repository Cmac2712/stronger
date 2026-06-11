## Parent

#39

## What to build

Deploy the `generate-workout` edge function, wire its secret, and verify it live. **HITL** — requires setting a Supabase secret, deploying server-side compute (a first for this project), and confirming live model behaviour.

Set `ANTHROPIC_API_KEY` as a Supabase secret, deploy the function, and confirm that an authenticated call (valid Supabase JWT) with a chosen split plus a sample history summary returns a valid list of library exercise ids at acceptable latency — Haiku is chosen specifically so the user isn't left waiting. An unauthenticated call is rejected.

## Acceptance criteria

- [ ] `ANTHROPIC_API_KEY` is set as a Supabase secret (never shipped in the app bundle)
- [ ] The function is deployed and reachable
- [ ] A live authenticated call returns `{ exerciseIds }` containing only valid library ids for a given split
- [ ] An unauthenticated call is rejected with the expected status
- [ ] Latency is acceptable for a user waiting to start training (sanity check)

## Blocked by

- #44 (the edge-function source + contract)
