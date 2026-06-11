## Parent

#22 — PRD: UI/UX overhaul — plain set-entry rows, lucide icons, dark-theme finish

## What to build

Replace the active workout's "Log Set" button and the separate logged-set rows with a single unified set row of the shape `[reps] [weight] [✓]`, used for both entering and displaying a set. The open row carries a grey ✓ pre-filled from the previous set; tapping it commits the set, turns the ✓ green, starts the rest timer (active session), and opens a fresh pre-filled row below. Logged rows show a green ✓ and are corrected by tapping a field in place (commit on blur) — there is no separate edit mode.

The row's state reduces to: an optional committed set (absent = open row), the current draft reps/weight, and whether the commit guard (`reps ≥ 1`) passes. This merges the former stepper-input and editable-set-row components into one. Swipe-to-delete is a separate slice. Governed by [ADR-0003](docs/adr/0003-plain-set-entry-fields-inline-confirm.md).

## Acceptance criteria

- [ ] Each set is one row: a reps field, a weight field, and a confirm ✓.
- [ ] The open row's ✓ is grey and the row is pre-filled from the previous set; tapping ✓ commits the set, turns ✓ green, and a fresh pre-filled open row appears below.
- [ ] Committing a set in the active workout starts the rest timer.
- [ ] Tapping a field on a logged row edits it in place and saves on blur; no separate edit mode exists.
- [ ] The ✓ is disabled until `reps ≥ 1`.
- [ ] The former stepper component and editable-set-row component are removed, and the duplicated reps/weight step constants are gone.

## Blocked by

- #24
- #25
