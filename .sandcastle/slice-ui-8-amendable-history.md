## Parent

#22 — PRD: UI/UX overhaul — plain set-entry rows, lucide icons, dark-theme finish

## What to build

Make finished (historical) workouts use the unified set row and allow adding sets to them. Session detail renders the unified row for each set (edit-in-place, swipe-to-delete) plus an open pre-filled row per exercise, so a set can be added to a finished workout.

Generalise the set-commit logic so a set can be appended to **any** session-exercise (not just the active session's), computing `setNumber` as one past the maximum within that session-exercise. Amending a historical session must **not** start the rest timer and must **not** change the session's `startedAt`/`endedAt` (no re-activation). The open row in a historical session pre-fills from the **last set of that exercise within that same session** (not the most-recent-overall used in the active workout). This matches the amendable-Session semantics recorded in [CONTEXT.md](CONTEXT.md).

## Acceptance criteria

- [ ] Session detail renders each set as a unified row with edit-in-place and swipe-to-delete.
- [ ] A finished workout shows an open pre-filled row per exercise; confirming it adds a set to that historical session.
- [ ] Adding a set to a historical session does not start the rest timer and does not change `startedAt`/`endedAt`.
- [ ] `setNumber` increments per session-exercise.
- [ ] The historical open-row prefill comes from the last set of that exercise within that same session.
- [ ] Unit tests cover the set-commit logic (active + historical) and the historical prefill branch.

## Blocked by

- #28
