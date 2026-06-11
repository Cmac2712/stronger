## Parent

#22 — PRD: UI/UX overhaul — plain set-entry rows, lucide icons, dark-theme finish

## What to build

Add the `lucide-react-native` icon library (pure JS/SVG riding on the already-installed `react-native-svg`; Expo Go-safe; pin a version compatible with the installed `react-native-svg` and the Expo SDK) and build a thin icon wrapper that maps a size and a theme colour token onto the underlying lucide icon, so icon colour stays single-sourced from the theme rather than from utility classes.

Prove it end-to-end by giving the Workout and History tabs real icons. Governed by [ADR-0004](docs/adr/0004-lucide-icon-library.md).

## Acceptance criteria

- [ ] `lucide-react-native` is added and renders in Expo Go with no custom dev build.
- [ ] A reusable icon wrapper takes a theme colour token + size and renders a lucide icon.
- [ ] The Workout and History tabs display recognisable icons.
- [ ] Tab icons honour the active/inactive tints established in the dark-theme slice.

## Blocked by

- #23
