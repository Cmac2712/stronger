# Plain set-entry fields with an inline confirm, replacing stepper buttons

Set entry no longer uses the ±1 reps / ±2.5 kg stepper buttons the PRD specified (user stories 10–11, lines 15, 32–33, 149–150). Reps and weight are now plain tap-to-type numeric fields, and "Log Set" becomes an inline check that turns green on commit. A single unified row — `[reps] [weight] [✓]` — replaces both the old entry steppers and `EditableSetRow`: a grey ✓ marks the open, prefilled row; tapping it commits the set (turning the ✓ green) and opens a fresh prefilled row below. Editing is tap-a-field-in-place; deletion is swipe-left.

This deliberately reverses the PRD's rationale — steppers existed so that adjustments "don't require pulling up the keyboard" mid-set — so it is recorded here to stop a future reader from "restoring" the stepper design the PRD still describes.

## Considered options

- **Keep the steppers, restyle only.** No PRD deviation, no keyboard regression — but doesn't deliver the clean plain-field layout that was wanted. Rejected.
- **Plain field plus a small ± nudge.** Preserves no-keyboard adjustment for the common +2.5 kg / +1 rep case, but the row carries two extra buttons per field and loses the compact single-row look. Rejected.
- **Plain field only, inline ✓ confirm.** Chosen. Cleanest, most compact row; one component for both entry and logged sets.

## Consequences

- Every value *change* now goes through the keyboard. This is accepted because prefill (`getLastSetFor`, which includes earlier sets in the current session) keeps the common case — repeating a set — a single ✓ tap. The keyboard cost lands mainly on the first set of an exercise and on progressive-overload adjustments.
- `Stepper.tsx` and `EditableSetRow.tsx` collapse into a small `NumericField` composed inside a unified `SetRow`; the duplicated `REP_STEP` / `WEIGHT_STEP` constants are removed (no stepping). The name **stepper** survives only on the rest-timer duration ± control, which is unaffected.
- `logSet` generalizes to target any sessionExercise (not just the active session's), computes `setNumber` per-exercise, and starts the rest timer only for the *active* session. This is what makes historical sessions amendable by *adding* sets (see CONTEXT.md "Session"), not just editing/deleting them.
- Weight precision is unified: stored value and displayed value both round to 1 decimal place, fixing the prior store-2dp / display-1dp mismatch. Typed values are not snapped to a plate grid (you can still type `82.5`).
- The ✓ is disabled until `reps ≥ 1` (weight `0` remains valid for bodyweight), preventing a meaningless `0×0` log on a never-performed exercise.
- The PRD's stepper / tap-to-type language is superseded; flagged in CONTEXT.md until the PRD is updated.
