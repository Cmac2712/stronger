## Parent

#22 — PRD: UI/UX overhaul — plain set-entry rows, lucide icons, dark-theme finish

## What to build

Add swipe-left-to-delete to the unified set row using `ReanimatedSwipeable` (`react-native-gesture-handler` and `react-native-reanimated` are already installed and the gesture root already wraps the app — no new dependency). Deletion is immediate, with no confirmation and no undo, consistent with the app's existing behaviour. This replaces the old `✕` text-glyph delete affordance. Because the behaviour lives on the shared set-row component, any later usage of that row (e.g. session detail) inherits it.

## Acceptance criteria

- [ ] Swiping a set row left in the active workout reveals and triggers delete.
- [ ] Deletion is immediate — no confirmation dialog, no undo.
- [ ] The old `✕` text-glyph delete affordance is gone.
- [ ] Swipe-to-delete is implemented on the shared set-row component so future usages inherit it.

## Blocked by

- #28
