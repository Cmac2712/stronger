# lucide-react-native for icons throughout the app

The app had no icon library — every "icon" was a Unicode glyph (`−` `+` `✕`) in a `<Text>`. For the UI overhaul (icons in the tab bar, the inline set-confirm ✓, swipe-to-delete, rest-timer controls, action buttons, and light decorative touches) we standardized on `lucide-react-native`, which renders through the already-installed `react-native-svg`.

The choice is constrained by the hard PRD rule (line 57) that everything must work in Expo Go with no custom dev build — the same constraint that drove the auth decision in [ADR-0002](./0002-email-password-auth-with-verification.md). Recording the choice so the alternative (the SDK-bundled `@expo/vector-icons`) isn't assumed to be the obvious one.

## Considered options

- **lucide-react-native.** Chosen. One curated, consistent, modern line-icon set; pure JS/SVG riding on the `react-native-svg` already in the project (no fonts, no native linking → Expo Go-safe); also what gluestack's `ButtonIcon` expects. Cost: a new (low-risk) dependency, pinned to a version compatible with `react-native-svg` 15.x / Expo SDK 56.
- **@expo/vector-icons.** Bundled with the Expo SDK, zero install, guaranteed Expo Go-safe — but ships multiple icon families, so visual consistency depends on disciplining ourselves to one (e.g. Feather). Rejected in favor of a single curated set and reusing the SVG dependency already present.
- **Unicode glyphs (status quo).** No dependency, but font-dependent rendering, inconsistent, and no real set (no trash / clock / dumbbell / tab glyphs). Rejected — it doesn't deliver "icons throughout."
- **react-native-vector-icons (standalone).** Avoided: traditionally needs native font linking / a custom dev build, which violates the Expo Go constraint.

## Consequences

- Icons take `size`/`color` props directly, so icon color flows from the [theme.ts](../../src/theme.ts) tokens (via a thin wrapper) rather than NativeWind classes, keeping color single-sourced.
- The ad-hoc Unicode `−` / `+` / `✕` glyphs are replaced with lucide icons; touch targets and `accessibilityLabel`s must be preserved when swapping.
