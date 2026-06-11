## Parent

#39

## What to build

A **Workout-complete summary screen** shown after finishing a non-empty session.

When a session that has at least one logged set ends, the app navigates to a new `WorkoutCompleteScreen` instead of dropping straight back to idle. It summarises the session just finished: total duration, total set count, and a per-exercise breakdown (each exercise's set count and its top set). A primary **Done** action returns to the idle launch screen with no active session.

Empty sessions (no logged sets) skip the screen entirely and go straight to idle, as today.

This slice is the screen plus the navigation seam only — the "Save as template" action is added in a later slice, so the seam needs to be a place that action can later hang off.

## Acceptance criteria

- [ ] Ending a non-empty session (≥1 logged set) navigates to the summary screen; ending an empty session goes straight to idle
- [ ] The screen shows total duration, total set count, and a per-exercise breakdown (set count + top set per exercise)
- [ ] Top set follows the existing definition (highest weight; ties by reps desc, then setNumber desc)
- [ ] **Done** returns to the idle launch screen with no active session
- [ ] Maestro smoke: complete a non-empty workout → see the summary → Done → idle; an empty session skips the summary
- [ ] Green gate: typecheck + jest + e2e:smoke

## Blocked by

None - can start immediately
