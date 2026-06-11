## Parent

#39

## What to build

The user-facing path for **user templates**: save one from the complete screen, see it in its own list, apply it, delete it.

On the Workout-complete summary screen, add a **Save as template** action. It opens a name prompt pre-filled with the default derived by `templateFromSession` (dominant muscle groups), saves the distinct exercises actually logged (≥1 set) in first-performed order, and confirms. Saving is optional — not every finished workout becomes a template.

On the idle launch screen, add a **Yours** section listing the user's templates beneath the Builtin section. User rows use the existing **swipe-to-delete** gesture; builtin rows have no delete. Tapping a user row applies it (starts a session) exactly like a builtin one.

Because an AI-generated session is just a session, this same save flow is what later lets a user keep an AI workout they liked — no extra work is needed here for that.

## Acceptance criteria

- [ ] "Save as template" on the complete screen pre-fills the default name and saves only the exercises with ≥1 logged set, in first-appearance order
- [ ] Saved templates appear under a "Yours" section, visually distinct from "Builtin"
- [ ] Swiping a user template deletes it; builtin rows expose no delete affordance
- [ ] Tapping a user template starts a fresh session with its exercises (start-only, like builtin)
- [ ] Maestro smoke: complete a workout → Save as template → see it under Yours → apply it → its exercises appear in a new session → swipe-delete it
- [ ] Green gate: typecheck + jest + e2e:smoke

## Blocked by

- #41 (the Workout-complete summary screen this hangs the Save action off)
- #42 (the data layer: `templateFromSession`, `saveTemplate`/`deleteTemplate`, sync, `getTemplates` merge)
