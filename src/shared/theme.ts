import type { Theme } from "@react-navigation/native";

// Single source of truth for the app's dark-only palette (zinc family).
// Consumed by tailwind.config.js (className utilities) and navigationTheme
// (React Navigation headers, back arrows, tab bar) so both read the same values.
//
// Kept free of any runtime react-native import (the Theme import is type-only,
// erased at build) so the Tailwind/Node config can load it without dragging in
// the RN runtime.
export const colors = {
  page: "#09090b",
  card: "#18181b",
  "card-elevated": "#27272a",
  subtle: "#27272a",
  primary: "#fafafa",
  secondary: "#d4d4d8",
  muted: "#71717a",
  "primary-accent": "#2563eb",
  danger: "#dc2626",
  success: "#16a34a",
  "primary-accent-text": "#60a5fa",
  "danger-accent-text": "#f87171",
  "on-accent": "#ffffff",
} as const;

// Corner-radius tokens. `surface` for cards and surface-like containers,
// `control` for action buttons — both deliberately tight for a crisp,
// functional feel. Circular controls use rounded-full directly (not a token):
// their roundness is an affordance, not a surface radius.
export const radius = {
  surface: 6,
  control: 2,
} as const;

const fonts: Theme["fonts"] = {
  regular: { fontFamily: "sans-serif", fontWeight: "normal" },
  medium: { fontFamily: "sans-serif-medium", fontWeight: "normal" },
  bold: { fontFamily: "sans-serif", fontWeight: "600" },
  heavy: { fontFamily: "sans-serif", fontWeight: "700" },
};

export const navigationTheme: Theme = {
  dark: true,
  colors: {
    primary: colors["primary-accent"],
    background: colors.page,
    card: colors.card,
    text: colors.primary,
    border: colors.subtle,
    notification: colors["primary-accent"],
  },
  fonts,
};
