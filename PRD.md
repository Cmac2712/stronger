# PRD: Stronger — Personal Workout Tracker (Slice 0)

**Triage label:** `ready-for-agent`

## Problem Statement

I track my lifts in the gym so I know whether I'm progressing — am I lifting more reps or more weight than last week? Right now I have no reliable way to do this. Paper notebooks get lost or left at home, the Notes app on my phone turns into an unreadable wall of text after a few weeks, and full-featured commercial apps (Strong, Hevy, Jefit) bury the one thing I actually need — *"what did I do last time on this exercise?"* — behind onboarding flows, paywalls, social features, and dozens of fields I'll never fill in.

The friction I experience mid-set is the real problem. Between sets I am sweaty, breathing hard, and impatient. If logging a set takes more than two or three taps, I'll stop doing it. If finding "last time's numbers" requires more than one tap, I'll stop looking. And if my exercise history can fragment because of typos or unit changes, I'll stop trusting the data and stop using the app.

I want a private, single-user, friction-free logger that fits the way I actually train: a loose Push/Pull/Legs routine, kg only, working sets only (no warmup logging), with the previous session's numbers right there waiting for me to either confirm or nudge.

## Solution

**Stronger** is a React Native app (Android, distributed via Expo Go) that opens to a single "Start Workout" button. Tapping it begins an explicit session. I add exercises from a curated library (organised by muscle group) and log working sets with two-button steppers — reps ±1, weight ±2.5 kg — pre-filled with the values from the last time I performed that exercise. For unusual jumps I can tap the number itself and type with the keyboard.

When I'm done, I tap "End Workout" and the session is timestamped and saved. In the History tab I see a chronological list of past sessions and can drill into any session's detail. Tapping any exercise name (in a session, in history, anywhere) opens that exercise's history: a list of past sets and a small sparkline of top-set weight over the last ~10 sessions — enough visual signal to answer "am I getting stronger?" without a charting library.

For Slice 0 everything lives locally on the device in AsyncStorage. No accounts, no sync, no cloud, no rest timer, no templates, no notes. Those land in Slice 1 and Slice 2, but only after a week of real usage tells me which of them I actually want.

## User Stories

1. As a lifter, I want to open the app to a single, obvious "Start Workout" button, so that I never have to think about navigation before I've even put my bag down.
2. As a lifter, I want to start a workout session in one tap, so that the app gets out of my way at the start of every gym visit.
3. As a lifter, I want each session to be explicitly bounded by a start and end, so that I can later see how long my workouts take and trust that sets aren't bleeding into the wrong day.
4. As a lifter, I want to add exercises to my active session from a curated library, so that I don't have to type exercise names and risk typos fragmenting my history.
5. As a lifter, I want the exercise library grouped by muscle group (chest, back, legs, shoulders, arms, core), so that I can find exercises by the body part I'm training.
6. As a lifter, I want to add as many exercises as I want during a session, in any order, so that my loose Push/Pull/Legs routine isn't forced into a rigid template.
7. As a lifter, I want to remove an exercise from my active session if I change my mind, so that the session list reflects what I actually did, not what I intended.
8. As a lifter, I want to log a set with reps and weight (in kg), so that I have a complete record of every working set I perform.
9. As a lifter, I want the input fields for a new set to be pre-filled with the values from the last time I performed that exercise, so that confirming an unchanged set takes one tap.
10. As a lifter, I want stepper buttons (+/−) for reps (step 1) and weight (step 2.5 kg), so that small adjustments from last time's values are fast and don't require pulling up the keyboard.
11. As a lifter, I want to tap a number to bring up the numeric keyboard for large jumps, so that introducing a new lift or making a large weight change is still possible without spamming the steppers.
12. As a lifter, I want to log multiple sets per exercise within a single session, so that one exercise can have several working sets (the normal case).
13. As a lifter, I want to edit a set I just logged if I miscounted, so that small input errors don't permanently corrupt my history.
14. As a lifter, I want to delete a set, so that accidental taps or sets I didn't actually complete can be removed.
15. As a lifter, I want to edit or delete sets from past sessions, so that I can correct mistakes I only notice later.
16. As a lifter, I want to end a workout with one tap, so that closing out a session is as frictionless as starting one.
17. As a lifter, I want my sessions and sets to survive closing and reopening the app, so that I don't lose data between gym visits.
18. As a lifter, I want my data to survive the app being killed by the OS mid-session, so that an interrupted gym trip doesn't cost me the workout.
19. As a lifter, I want a History tab with a chronological list of past sessions, so that I can see at a glance what I've trained recently.
20. As a lifter, I want each entry in the session list to show the date, number of exercises, and total duration, so that I can scan my training history quickly.
21. As a lifter, I want to tap a session in the history list to see its full detail (every exercise, every set), so that I can review what exactly I did that day.
22. As a lifter, I want to tap any exercise name (inside a session or in history) to jump to that exercise's full history, so that I can answer "am I getting stronger on this lift?" with one tap.
23. As a lifter, I want the per-exercise history screen to show a list of past sets with the date they were performed, so that I have the raw numbers in front of me.
24. As a lifter, I want the per-exercise history to include a small sparkline of top-set weight over the last ~10 sessions, so that I get a visual sense of my trajectory without needing a separate analytics screen.
25. As a lifter, I want the app to use kg as the only weight unit, so that I don't have to fiddle with a unit toggle I'll never change.
26. As a lifter, I want a two-tab layout (Workout and History) and nothing else, so that the home screen stays ruthlessly focused on the two things I actually do.
27. As a lifter, I want the Workout tab to show my active session if I have one in progress, so that I can resume logging if I accidentally switch tabs.
28. As a lifter, I want the exercise picker to be a modal pushed from the active session, so that picking an exercise feels like a quick action rather than navigating away.
29. As a lifter, I want my data to be private to my device in Slice 0, so that I don't have to set up an account just to start logging this week.

## Implementation Decisions

### Platform and tooling
- **Target platform:** Android only. iOS is not in scope for Slice 0 and the rest of the design assumes Android.
- **Runtime:** Expo (latest stable SDK) running inside Expo Go. No custom native modules; everything must be supported by Expo Go without a custom dev build.
- **Language:** TypeScript.
- **Styling:** NativeWind (Tailwind utility classes for React Native). No component library; screens are composed from primitive RN components styled with NativeWind.
- **Navigation:** React Navigation. Bottom tab navigator with two tabs (Workout, History), each owning a stack navigator for pushed/modal screens.
- **State:** Zustand for the application store (active session + history). React Context is acceptable as a substitute but Zustand is preferred for the simpler subscription model and ease of testing.
- **Persistence (Slice 0):** AsyncStorage as the sole source of truth. The store is rehydrated from AsyncStorage on app launch and saved on every mutation.

### Module structure

The implementation is organised around four code modules and a thin UI layer. Two of those modules are intentionally deep (encapsulate real logic behind a small, stable interface) and two are intentionally shallow (data or pure rendering).

**1. `workoutStore` (deep, Zustand-backed)**

Owns all state transitions for the app. UI dispatches actions; store updates state. There is no business logic in components.

Public interface:
- `startSession()` — creates a new active session with `startedAt = now`, no exercises. Errors if a session is already active.
- `endSession()` — finalises the active session with `endedAt = now`, moves it from "active" to "history".
- `addExerciseToSession(exerciseId)` — appends a `sessionExercise` to the active session with the next ordering index.
- `removeExerciseFromSession(sessionExerciseId)` — removes a `sessionExercise` and all its sets.
- `logSet(sessionExerciseId, reps, weight)` — appends a set with the next setNumber for that sessionExercise.
- `updateSet(setId, { reps?, weight? })` — partial update; works on sets in any session, active or historical.
- `deleteSet(setId)` — removes a set from anywhere in history.
- `getLastSetFor(exerciseId)` — returns the most recent set (across all sessions, excluding the current in-progress sessionExercise) for this exercise, or `null`. Used by the UI to pre-fill the input fields.
- `getSessionsList()` — returns historical sessions sorted newest-first, each annotated with exercise count and duration.
- `getHistoryFor(exerciseId)` — returns all sets ever performed for this exercise, grouped by session, with dates. Includes a derived `topSetWeights` array (top working-set weight per session, last 10) for the sparkline.

**2. `persistence` (deep, wraps AsyncStorage)**

Single responsibility: serialise and deserialise the full workout state. The store is the only caller.

Public interface:
- `loadState(): Promise<PersistedState | null>` — reads the JSON blob under a fixed key, parses, validates the schema version, returns the state object or `null` if absent.
- `saveState(state: PersistedState): Promise<void>` — serialises the state and writes it.
- `PersistedState` includes a `schemaVersion: number` field. Loaders that encounter a different version either migrate (future) or refuse to load and start fresh. Slice 0 ships at schema version 1.

This module is the seam at which Slice 2 will introduce Supabase sync — the store will continue calling `persistence.saveState`, but the implementation will additionally enqueue a remote write. Keeping persistence behind this interface now is what makes Slice 2 cheap later.

**3. `exerciseLibrary` (shallow, static data)**

A hardcoded TypeScript module exporting the curated exercise list. Each entry has: `id` (stable string slug), `name`, `muscleGroup` (one of `chest`, `back`, `legs`, `shoulders`, `arms`, `core`). Approximately 30–50 entries spanning common barbell, dumbbell, machine, and bodyweight movements. No behaviour beyond `getAll()` and `getById(id)`.

The list is hardcoded — not editable by the user in Slice 0. Future slices may allow user-added exercises but the data shape is designed to accommodate that without a migration.

**4. `Sparkline` (deep, pure presentational)**

A pure component that takes an array of numbers (top-set weights over recent sessions) and renders a small line chart. Implementation should use `react-native-svg` (Expo Go-compatible) — no native dependencies, no charting library. Handles edge cases: empty array → renders nothing; single point → renders a dot. The component knows nothing about the workout domain; it just plots numbers.

**5. UI layer (shallow)**

Screens are thin: they read from the store via Zustand selectors, dispatch actions, and render. No business logic, no state-shape decisions, no calls to AsyncStorage. Screens involved:
- Workout tab: idle screen (with "Start Workout" button); active-session screen (list of session exercises, each with their sets and a stepper-based "log set" affordance, plus "Add Exercise" and "End Workout"); exercise picker (modal, library grouped by muscle group).
- History tab: session list; session detail; per-exercise history (with the sparkline).

### State shape

The persisted state is a single object:

```ts
{
  schemaVersion: 1,
  activeSession: Session | null,
  history: Session[], // ended sessions, newest-last for append efficiency
}

type Session = {
  id: string,
  startedAt: number, // epoch ms
  endedAt: number | null,
  sessionExercises: SessionExercise[],
}

type SessionExercise = {
  id: string,
  exerciseId: string, // FK into exerciseLibrary
  order: number,
  sets: Set[],
}

type Set = {
  id: string,
  setNumber: number,
  reps: number,
  weight: number, // kg, decimal allowed
}
```

(This shape was settled during design discussion; it encodes the decision to keep sessions self-contained, which makes session-level operations — list, delete, duration — trivial and avoids any join logic.)

### Interaction decisions

- **Pre-fill source:** `getLastSetFor(exerciseId)` returns the most recent set chronologically, regardless of whether it was logged earlier in the current session. This means within a session, if I do bench at 80 kg × 8, the next bench set is pre-filled with 80 × 8 — useful, because most working sets in a row are the same.
- **Steppers:** reps step is 1; weight step is 2.5 kg. No per-exercise customisation.
- **Tap-to-type:** tapping the number itself (not the stepper buttons) brings up the numeric keyboard for direct entry.
- **No warmup tagging:** all sets are working sets. If the user wants to skip logging warmups (the recommended pattern), they simply don't log them.
- **No rest timer in Slice 0:** explicitly deferred to Slice 1.
- **No templates in Slice 0:** explicitly deferred to Slice 1.
- **No per-exercise or per-session notes in Slice 0:** explicitly deferred to Slice 1.
- **Editing and deletion:** allowed on sets from any session, active or historical. No undo, no audit log — single user, no need.
- **Session display:** in the session list, each row shows the start date (formatted as "Sat 22 May"), the count of exercises, and the duration computed from `endedAt - startedAt`. Active session, if present, appears as a sticky element on the Workout tab rather than in the History list.
- **Sparkline data:** top working-set weight per session, last 10 sessions, in chronological order. "Top set" means the set with the highest weight; ties broken by reps then by setNumber.

### Out-of-scope architectural notes (informational, for context)

- **Slice 1** will add: PPL templates (`templates` table or array on state), an auto-start 2 min rest timer (pure UI state, no persistence), and per-exercise notes (a `notes: string` field on `SessionExercise`). The schemaVersion will bump to 2 with a migration that backfills `notes: ""`.
- **Slice 2** will add: Supabase email/password auth, optimistic mutation queue via TanStack Query, AsyncStorage demoted from source-of-truth to local cache. The `persistence` module is the only place that needs to change — the store interface stays identical.

## Testing Decisions

### Philosophy
Tests target the **public interface of deep modules** — the externally observable behaviour, not the implementation. A test should survive a refactor that doesn't change behaviour. We don't test that Zustand fires the right subscribers internally; we test that after `logSet(...)`, `getLastSetFor(...)` returns what we just logged. We don't test that AsyncStorage was called with a specific string; we test that `loadState()` after `saveState(s)` returns a deep-equal `s`.

UI components and screens are **not unit-tested** in Slice 0. They are shallow by design (no logic), so the value of testing them is low and the cost (RN testing setup, mocks for AsyncStorage, gesture simulation) is high. UI is validated manually by using the app in the gym.

### Modules under test

**1. `workoutStore`**

Tested as a black box: drive it through its public interface and assert observable state. Each test starts from a fresh store instance with empty state (no AsyncStorage, no `persistence` involvement — the persistence layer is injected/mockable so the store can be exercised in pure form).

Representative scenarios:
- Starting a session with no active session creates an active session with empty exercises.
- Starting a session when one is already active throws (or no-ops — decided at implementation time, whichever is chosen the test asserts the contract).
- Adding an exercise appends a `sessionExercise` with the correct `order`.
- Removing an exercise removes its sets along with it.
- Logging a set assigns the correct `setNumber` based on existing sets for that sessionExercise.
- `getLastSetFor(exerciseId)` returns `null` when the exercise has never been performed.
- `getLastSetFor(exerciseId)` returns the most recent set across all sessions including the current one.
- `updateSet` modifies the targeted set and no other.
- `deleteSet` removes the targeted set from history without affecting siblings.
- Ending a session moves it from `activeSession` to `history` and sets `endedAt`.
- `getSessionsList()` returns sessions newest-first with correct exercise count and duration.
- `getHistoryFor(exerciseId)` returns all matching sets grouped by session, and produces the correct `topSetWeights` for the sparkline (top weight per session, last 10 sessions, in chronological order).

**2. `persistence`**

Tested with an in-memory or mocked AsyncStorage:
- `loadState()` returns `null` when nothing is stored.
- `saveState(s)` followed by `loadState()` returns a deep-equal `s` for representative state objects (empty, one session, many sessions, active session present).
- `loadState()` returns `null` (and does not throw) if the stored blob is unparseable JSON.
- `loadState()` returns `null` (and does not throw) if `schemaVersion` is missing or unknown — this protects against forward incompatibility in future slices.

### Modules not tested

- `exerciseLibrary` — static data, no behaviour worth verifying with a test. A typo in an exercise name is a content issue, not a logic bug.
- `Sparkline` — pure presentational. Visual correctness is validated by eye, not by snapshot tests (which tend to be brittle on RN).
- UI screens — see philosophy above.

### Prior art
None in this codebase — it's greenfield. No existing tests to mimic.

## Out of Scope

The following are explicitly **not** part of Slice 0. They are noted here so reviewers don't suggest them as gaps:

- **Authentication and accounts.** No login, signup, or user identity. The app is private to the device.
- **Cloud sync and backup.** No Supabase, no Firebase, no remote storage. Data lives only in AsyncStorage. If the device is lost, the data is lost. This risk is accepted for Slice 0 on the basis that the goal is to validate the UX in a real gym before investing in durability.
- **iOS.** Android only.
- **Web or tablet support.** Phone form factor only.
- **Workout templates / programs.** No "Push Day" / "Pull Day" / "Legs Day" pre-defined exercise lists. Sessions are always built from scratch by picking exercises from the library. *(Slice 1.)*
- **Rest timer.** No auto-start, no countdown, no notification. *(Slice 1.)*
- **Per-exercise or per-session notes.** No free-text notes anywhere. *(Slice 1.)*
- **Warmup vs working set distinction.** All sets are treated equally. The user logs working sets only and ignores warmups.
- **Units other than kg.** No lb option, no unit toggle.
- **Exercise library editing.** The library is hardcoded. No user-added exercises in Slice 0. The data shape will accommodate this in a future slice without migration.
- **Progressive overload suggestions.** The app shows the last set but does not recommend "+2.5 kg" or "+1 rep". The user decides.
- **PR tracking, volume analytics, body-part frequency, calendar heatmap.** None of these views exist. Only the session list and per-exercise history with sparkline.
- **Cardio / time-based exercises / distance.** Reps and weight only. Running, planks, etc. are out of scope.
- **RPE / RIR.** Not tracked.
- **Social features, sharing, exports.** None.
- **Multi-user, family sharing, coach view.** None — strictly single-user.
- **Dark mode toggle.** Not in Slice 0 (a single theme is fine; light or dark is an aesthetic choice for the developer).
- **Onboarding / tutorial / empty-state coaching.** Not needed — single user knows what the app does.

## Further Notes

**Why Slice 0 ships without sync:** the design conversation explicitly weighed shipping all three slices upfront vs shipping Slice 0 and using it for a week before building Slices 1 and 2. The decision was to ship Slice 0 first because every shipped app changes once real usage starts. Spending a week on Supabase plumbing before a single workout is logged would be premature. The data-loss risk is acknowledged and accepted on the basis that one week of throwaway data is the cost of learning what the app actually needs.

**Why the persistence module exists as a separate seam even in Slice 0:** because Slice 2's whole job is to swap AsyncStorage for AsyncStorage + Supabase without changing the store. If the store called AsyncStorage directly, Slice 2 would be a refactor. With the seam in place, Slice 2 is purely additive.

**Why Zustand and not Context:** the store has a moderately wide surface (many actions, derived selectors like `getLastSetFor`) that benefits from Zustand's selector subscriptions — Context would either re-render the whole tree on every mutation or require manual memoisation everywhere. Zustand also makes testing trivial: the store factory can be called in a test, exercised, and inspected without rendering any components.

**Curated library content:** the exact list of ~30–50 exercises is a content decision deferred to implementation. A reasonable starting set includes the main barbell lifts (bench, squat, deadlift, OHP, row), common dumbbell variants, key machine movements (lat pulldown, leg press, leg curl, leg extension, cable row), and core/accessory work (curls, triceps extensions, lateral raises, face pulls, planks, hanging leg raises). The data shape allows additions without schema changes.
