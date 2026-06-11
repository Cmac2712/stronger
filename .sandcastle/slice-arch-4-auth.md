## Parent

#31 — PRD: Feature-based source layout with a single app-level store.

## What to build

Create the `src/features/auth/` feature and move the entire authentication flow into it: the sign-in, sign-up, and verify-email screens, the AuthBrandMark component, and the auth-code extraction helper (with its test). The folder is flat (no `screens/`/`components/` sub-folders); tests stay colocated. The auth-code helper moves here out of the old Supabase folder. Rewrite imports: auth files reference shared code via `@shared/*` and the Supabase client via `@sync/*`; the App entrypoint references the auth screens and helper via `@features/auth/*`. Use `git mv`.

## Acceptance criteria

- [ ] `features/auth/` contains the three auth screens, AuthBrandMark, and the auth-code helper (+ test), flat, moved via `git mv`.
- [ ] Auth files import shared code via `@shared/*` and the Supabase client via `@sync/*`.
- [ ] The App entrypoint imports the auth screens and helper via `@features/auth/*`.
- [ ] `npm run typecheck` passes and `npm test` is green (auth-code helper test included).
- [ ] No change to the auth flow's runtime behavior.

## Blocked by

- #32
- #34
