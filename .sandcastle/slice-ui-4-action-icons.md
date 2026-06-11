## Parent

#22 — PRD: UI/UX overhaul — plain set-entry rows, lucide icons, dark-theme finish

## What to build

Add leading icons (via the icon wrapper) to the primary action buttons — Add Exercise, End Workout, Sign Out, and Save / Cancel — and replace the remaining ad-hoc text glyphs on controls (the rest-timer's − / + duration buttons, and any leftover glyphs) with lucide icons. Preserve touch-target sizes and accessibility labels when swapping a glyph for an icon. Decorative and empty-state icons are handled in a separate slice.

## Acceptance criteria

- [ ] Add Exercise, End Workout, Sign Out, Save, and Cancel carry leading icons.
- [ ] The rest-timer ± duration controls use lucide icons instead of text glyphs.
- [ ] Touch-target sizes and accessibility labels are preserved.
- [ ] Icon colours come from theme tokens.

## Blocked by

- #25
