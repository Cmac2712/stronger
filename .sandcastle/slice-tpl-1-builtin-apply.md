## Parent

#39

## What to build

Introduce **builtin templates** and turn the idle Workout screen into a launch screen that can start a session pre-filled from one.

A hardcoded, read-only `templateLibrary` ships three builtin templates — **Push**, **Pull**, **Legs** — each a named, ordered list of library exercise ids with stable, namespaced ids (e.g. `builtin-push`). It also exports the fixed six-value **Split** set (Push, Pull, Legs, Upper, Lower, Full body) for later AI use. Its interface mirrors the exercise library: `getAll()`, `getById(id)`.

The store gains `applyTemplate(exerciseIds)`, which composes the existing `startSession()` + `addExerciseToSession()` per id, in order. It is **start-only**: valid only when no session is active (the launch screen is only shown when idle). It also gains `getTemplates()`, which for now returns the builtin templates, each tagged with a `source` marker.

The idle launch screen keeps the plain **Start Workout** (empty session) option and adds a **Builtin** section listing the three templates. Tapping a row applies the template and lands the user in a fresh session with those exercises added (empty set lists); the existing per-exercise prefill fills reps/weight from history as it does today. Builtin rows are read-only — no delete affordance.

## Acceptance criteria

- [ ] `templateLibrary` exposes Push/Pull/Legs as ordered exercise-id lists with stable `builtin-*` ids, plus the six-value `Split` set; `getAll`/`getById` work
- [ ] Every builtin template's exercise ids resolve via the exercise library (FK-integrity unit test)
- [ ] `applyTemplate` starts a session and adds the template's exercises in order; it never corrupts an already-active session (guarded no-op or throws, matching `startSession`)
- [ ] `getTemplates()` returns builtin templates with a `source` marker
- [ ] The idle Workout screen shows Start Workout (empty) and a Builtin section; tapping a builtin row starts a prefilled session
- [ ] Maestro smoke: from idle, tap a builtin template → land in an active session containing its exercises
- [ ] Green gate: typecheck + jest + e2e:smoke

## Blocked by

None - can start immediately
