## Parent

#22 — PRD: UI/UX overhaul — plain set-entry rows, lucide icons, dark-theme finish

## What to build

The app palette is already dark, but navigation headers and the bottom tab bar still render React Navigation's default light chrome, because the built-and-unit-tested `navigationTheme` is never passed to the navigation container. Wire it in so headers and the tab bar render dark; style the system status bar for a dark background; and set the bottom-tab tints (active = blue accent, inactive = muted).

Then sweep the remaining off-palette colours onto the central theme tokens so the blue accent is single-sourced: the sparkline stroke, the rest-timer bar's overlay / "green" literal classes, and the raw text-input colours. No behaviour changes — this is a presentation-only fix.

## Acceptance criteria

- [ ] Navigation headers and the bottom tab bar render in the dark palette — no light chrome anywhere.
- [ ] The system status bar is styled for a dark background.
- [ ] The active tab uses the blue accent tint; inactive tabs use the muted tint.
- [ ] The sparkline stroke, rest-timer-bar colours, and text-input colours all read from the central theme tokens — no hardcoded hex or off-token literals remain in those spots.
- [ ] The blue accent has a single source of truth in the theme.
- [ ] Existing theme unit tests still pass.

## Blocked by

None - can start immediately
