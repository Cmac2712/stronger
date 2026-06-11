## Parent

#22 — PRD: UI/UX overhaul — plain set-entry rows, lucide icons, dark-theme finish

## What to build

Replace the ±1 reps / ±2.5 kg stepper buttons in the active workout's set entry with plain tap-to-type numeric fields for reps and weight. Reps accept whole numbers only; weight accepts a non-negative decimal that is normalised to **one** decimal place for both storage and display, so the shown value always equals the stored value (this fixes the current store-to-2dp / display-at-1dp mismatch). Typed weights are **not** snapped to a plate grid (e.g. `82.5` is preserved).

The entry stays pre-filled from the previous set (existing prefill behaviour). The confirm affordance (today's "Log Set") is unchanged in this slice — the unified row comes later. Confirming a set is disabled until `reps ≥ 1` (weight `0` stays valid for bodyweight). Governed by [ADR-0003](docs/adr/0003-plain-set-entry-fields-inline-confirm.md).

## Acceptance criteria

- [ ] Reps and weight are entered by tapping a field and typing; no ± stepper buttons remain in set entry.
- [ ] Reps reject non-integer input; weight accepts decimals.
- [ ] A typed weight is stored and displayed identically at one decimal place (e.g. `77.56` → `77.6`); a value like `82.5` is preserved, not grid-snapped.
- [ ] The entry is pre-filled with the previous set's reps and weight.
- [ ] The confirm/log action is disabled until `reps ≥ 1`; weight `0` is allowed.
- [ ] Unit tests cover weight normalisation and the active-session prefill selector (prior art: `parseNumericInput.test.ts`, `workoutStore.test.ts`).

## Blocked by

None - can start immediately
