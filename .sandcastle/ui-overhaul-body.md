# PRD: UI/UX overhaul — plain set-entry rows, lucide icons, dark-theme finish

Supporting docs: [CONTEXT.md](CONTEXT.md), [docs/adr/0003-plain-set-entry-fields-inline-confirm.md](docs/adr/0003-plain-set-entry-fields-inline-confirm.md), [docs/adr/0004-lucide-icon-library.md](docs/adr/0004-lucide-icon-library.md). Adjacent open issues (tracked separately, not absorbed here): #13 (vibration on rest-timer end), #14 (rename "End Workout").

## Problem Statement

Logging works, but the workout screen feels unfinished and dated. The set-entry control is a heavy cluster of −/+ buttons stacked two-high per exercise; the app has no real icons (just text glyphs `−` `+` `✕` and text-only buttons); and although the colour palette is already dark, the navigation headers and the bottom tab bar still render in light chrome, so the app doesn't read as a cohesive dark product. As the single user, I want logging a set to feel clean and modern — a simple row where I type reps and weight and tap a check to confirm — with icons throughout and a properly dark UI with blue accents.

## Solution

Replace the stepper buttons with a single compact **set row**: plain tap-to-type **reps** and **weight** fields and an inline check (✓) that turns green on commit. Every set — whether being entered or already logged — is one row of the same shape; the open row carries a grey ✓ pre-filled from the previous set, and tapping it commits the set, turns the ✓ green, and opens a fresh pre-filled row below. Repeating a set stays a single tap (prefill); changing a value uses the keyboard. A logged value is corrected by tapping the field in place; a set is removed by swiping the row. Finished workouts gain the same row and can now be **amended by adding sets**, not just editing or deleting them.

Adopt **lucide-react-native** for icons across the tab bar, the set-confirm ✓, swipe-to-delete, the rest-timer controls, the action buttons, and light decorative touches (empty-state glyphs, auth-screen marks, sign-in field icons). Finish the dark theme by wiring the already-built `navigationTheme` into navigation so headers and the tab bar render dark, adding tab icons and active/inactive tints, and routing the few hardcoded off-palette colours through the central theme so the accent stays single-sourced blue.

## User Stories

1. As the lifter, I want to log a set by typing reps and weight into plain fields and tapping a check, so that entry feels direct and uncluttered.
2. As the lifter, I want the check to turn green when I commit a set, so that I get unmistakable confirmation the set was recorded.
3. As the lifter, I want each set to be a single row of `reps`, `weight`, and a check, so that the screen stays compact and scannable.
4. As the lifter, I want the open entry row pre-filled with my previous set's reps and weight, so that repeating a set is a single tap on the check.
5. As the lifter, I want a fresh pre-filled row to appear immediately after I commit a set, so that I can log my next set without any extra navigation.
6. As the lifter, I want logged sets to stack above the open row, each showing its reps and weight with a green check, so that I can see my progress within the exercise at a glance.
7. As the lifter, I want to tap a field on a logged set and retype it to fix a mistake, so that correcting a typo doesn't require a separate edit mode.
8. As the lifter, I want a corrected value to save as soon as I leave the field, so that I don't have to hunt for a save button.
9. As the lifter, I want to swipe a set row to delete it, so that removing a mis-logged set is quick and the row stays visually clean.
10. As the lifter, I want deletion to be immediate with no confirmation dialog, so that the friction-free, single-user flow is preserved (consistent with today's behaviour).
11. As the lifter, I want to type any weight to one decimal place (e.g. 82.5), so that microplate and fractional loads are representable without fighting a grid.
12. As the lifter, I want the weight I see to always equal the weight that's stored, so that I never doubt what was actually recorded.
13. As the lifter, I want reps constrained to whole numbers, so that I can't accidentally record a fractional rep count.
14. As the lifter, I want the check disabled until reps is at least 1, so that I can't log a meaningless empty set on an exercise I've never performed.
15. As the lifter, I want a weight of 0 to remain valid, so that I can log bodyweight movements.
16. As the lifter, I want committing a set to start the rest timer automatically (in an active workout), so that I don't have to start it by hand.
17. As the lifter, I want to add a set to a finished workout, so that I can complete a record I forgot to finish, without re-opening the workout.
18. As the lifter, I want amending a past workout to never start the rest timer or change the workout's start/end time, so that history stays accurate.
19. As the lifter, when adding a set to a past workout, I want the open row pre-filled from the last set of that exercise in that same workout, so that I continue that day's progression rather than today's numbers.
20. As the lifter, I want the bottom tab bar to show icons for the Workout and History tabs, so that the two destinations are recognisable at a glance.
21. As the lifter, I want the active tab tinted with the blue accent and inactive tabs muted, so that I can see where I am.
22. As the lifter, I want the navigation headers and tab bar to be dark like the rest of the app, so that the product feels cohesively dark rather than half-light.
23. As the lifter, I want the system status bar styled for a dark UI, so that the top of the screen matches.
24. As the lifter, I want the primary action buttons (Add Exercise, End Workout, Sign Out, Save/Cancel) to carry leading icons, so that their purpose is instantly readable.
25. As the lifter, I want the rest-timer adjust controls and the set-confirm to use consistent icons, so that controls feel like one designed system rather than ad-hoc glyphs.
26. As the lifter, I want a small glyph in empty states (e.g. on the empty workout list), so that empty screens feel intentional — without instructional or coaching text.
27. As the lifter, I want a simple mark on the auth screens and mail/lock/eye icons on the sign-in fields, so that signing in feels polished and the password field can be revealed.
28. As the lifter, I want the blue accent to come from a single source, so that the accent is consistent everywhere and easy to adjust later.
29. As the lifter, I want the sparkline and rest-timer colours to use the same theme palette as everything else, so that nothing looks off-palette.
30. As the lifter, I want the +/- and ✕ text glyphs replaced with real icons, so that controls render consistently regardless of platform font.
31. As the lifter, I want touch targets on the fields and the check to stay large enough to hit mid-set, so that logging is reliable when I'm sweaty and rushed.
32. As the lifter, I want the History tab's session detail to use the same set row, so that editing the past behaves identically to logging the present.

## Implementation Decisions

**Architecture is recorded in ADRs.** The stepper removal and unified-row model are governed by [ADR-0003](docs/adr/0003-plain-set-entry-fields-inline-confirm.md); the icon-library choice by [ADR-0004](docs/adr/0004-lucide-icon-library.md). The amendable-history semantics are clarified in the **Session** term of [CONTEXT.md](CONTEXT.md).

**Deep logic modules (extracted so the risky behaviour is testable without React):**

- **Prefill selector.** A pure selector over store state that, given a session-exercise, returns the reps/weight to seed the open row. It branches on session state: for the *active* session it returns the most recent set for that exercise (the existing "last set" semantics, which already include earlier sets in the current session); for a *historical* session it returns the last set of that exercise **within that same session**; with no prior set it returns `{ reps: 0, weight: 0 }`.
- **Set-commit logic (generalised `logSet`).** The commit action takes a session-exercise identifier and appends a set to it regardless of whether the session is active or historical. `setNumber` is computed as one past the current maximum **within that session-exercise**. The rest timer is started **only** when the target session is the active one; committing to a historical session leaves the rest-timer state untouched and does not alter the session's `startedAt`/`endedAt`.
- **Weight normalisation.** Reps parse as integers only. Weight parses as a non-negative decimal and is rounded to **one** decimal place for both storage and display, so the displayed value and the stored value can never disagree. Typed values are **not** snapped to a plate grid. This extends the existing numeric-parsing utility rather than introducing a new one.
- **Commit guard.** A pure predicate gating the ✓: enabled only when `reps ≥ 1` (weight `0` permitted). Folded into the components; not separately unit-tested.

**UI modules (composed from the above; validated by eye in the gym, per the Slice-0 convention that screens are not unit-tested):**

- **`NumericField`.** A plain tap-to-type numeric input replacing the stepper's input internals. Controlled `value`/`onChange`, an integer-vs-decimal mode, a minimum, and a placeholder. Selecting the field selects its contents for easy overtype; the value commits on blur/submit and invalid input preserves the prior value. Carries the keyboard-type and dark keyboard-appearance the inputs use today.
- **`SetRow`.** The unified `[reps] [weight] [✓]` row that merges today's separate entry steppers and the editable logged-set row into one component. It owns the open-vs-logged distinction (a set is "logged" once committed; the only visual difference is the ✓ colour), composes two `NumericField`s and the commit guard, renders the ✓ via the icon layer, and wraps the row in a swipe-to-delete affordance. The set row's state reduces to: an optional committed set (absent = open row), the current draft reps/weight, and whether the commit guard passes — there is no separate "edit mode" flag.
- **Icon layer.** A thin wrapper around lucide that maps a size and a theme colour token to the underlying icon's `size`/`color` props, keeping icon colour single-sourced from the theme rather than from utility classes. Used for the tab icons, ✓, swipe-delete action, rest-timer ±, action-button glyphs, and decorative marks.
- **Theme wiring.** Pass the existing `navigationTheme` to the navigation container so headers and the tab bar render dark; add `tabBarIcon`s and explicit active (accent) / inactive (muted) tints; and move the remaining hardcoded colours (the sparkline stroke, the rest-timer overlay/`green` classes, and the raw text-input colours) onto the central theme tokens so the blue accent has one source of truth.

**Dependencies.** `lucide-react-native` is added (pure JS/SVG, riding on the already-installed `react-native-svg`; Expo Go-safe, pinned to a version compatible with the installed `react-native-svg` and Expo SDK). Swipe-to-delete uses `ReanimatedSwipeable`; `react-native-gesture-handler` and `react-native-reanimated` are already installed and the gesture root already wraps the app — no new gesture/animation dependency.

**Removals.** The dedicated stepper component and the standalone editable-set-row component are superseded by `SetRow`/`NumericField`; the duplicated reps/weight step constants are deleted (there is no stepping). The name "stepper" survives only on the rest-timer's duration ± control, which is out of scope here.

## Testing Decisions

**What makes a good test here:** assert externally observable behaviour, not internals. Tests drive the store actions and pure utilities and assert on the resulting state and return values — what set got appended, what `setNumber` it received, whether the rest timer changed, what the prefill returned, what a typed string normalises to — never on how a component renders or which internal function was called. UI components are deliberately **not** unit-tested (Slice-0 convention: screens are validated by using the app in the gym, since RN snapshot tests are brittle).

**Modules to be tested (chosen):**

- **Prefill selector** — active session returns the most recent set for the exercise; historical session returns the last set of that exercise within that same session; a never-performed exercise and an exercise with no sets in the target session both return `{0,0}`.
- **Set-commit logic** — committing to the active session appends the set and starts the rest timer; committing to a historical session appends the set, leaves the rest-timer state untouched, and leaves `startedAt`/`endedAt`/duration unchanged; `setNumber` increments per session-exercise; deletion remains immediate.
- **Weight normalisation** — `77.56 → 77.6` for both stored and displayed value; `82.5` survives unchanged (no grid snap); a fractional reps entry is rejected; the displayed value never shows two decimals.

**Not separately tested:** the commit guard (a trivial predicate folded into the components) and all UI modules (`NumericField`, `SetRow`, icon layer, theme wiring).

**Prior art:** `src/store/workoutStore.test.ts` (store-action behaviour — model for prefill and set-commit tests), `src/util/restTimer.test.ts` (rest-timer state transitions — model for asserting the timer is/ isn't started), and `src/util/parseNumericInput.test.ts` (numeric parsing contract — extend for weight normalisation).

## Out of Scope

- **A light/dark toggle or any light theme.** The app stays forced-dark (reaffirms the Slice-0 PRD's "dark-mode toggle out of scope" decision).
- **Re-activating a finished workout.** Adding a set amends a historical session in place; it never sets `endedAt` back to null (the rejected alternative; see the Session term in CONTEXT.md).
- **Grid-snapping typed weights, per-exercise step sizes, and non-kg units.** Weight is free 1-dp decimal entry in kg only.
- **Coaching/onboarding copy.** Empty states get a glyph only, never instructional text.
- **Maximalist iconography** (per-exercise or per-muscle-group glyphs, icons on every list row/header).
- **Renaming "End Workout"** (#14) and **rest-timer vibration** (#13) — tracked as their own issues.
- **New charts or analytics** beyond the existing sparkline.
- **iOS, tablet, and web layouts** — Android phone portrait only.

## Further Notes

- The single highest-leverage change is wiring `navigationTheme` into the navigation container: it is a latent-bug fix (the theme is already built and unit-tested but never passed in), and it is what makes the headers and tab bar actually dark. Land it first so the rest of the dark-theme polish reads correctly.
- The unified `SetRow` is a net simplification: it collapses two components into one and removes the separate edit mode and the step constants.
- The prefill branch (active vs historical) is the most likely place for a silent regression and is the primary reason the prefill selector is tested in isolation.
