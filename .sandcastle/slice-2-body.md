# Slice 2: Sign-up flow + email verification + deep link

## Parent

[#15 PRD: Slice 2 — Supabase sync and multi-device persistence](https://github.com/Cmac2712/stronger/issues/15)

Supporting docs: [CONTEXT.md](CONTEXT.md), [docs/adr/0002-email-password-auth-with-verification.md](docs/adr/0002-email-password-auth-with-verification.md).

## What to build

In-app sign-up flow with email verification on. The user creates an account from inside the app, receives a verification email, taps the link, and lands back in the app already signed in.

User-facing behaviour after merge:

- A "Don't have an account? Sign up" link on the sign-in screen navigates to a sign-up screen.
- The sign-up screen has fields for email, password, and confirm-password, plus a submit button.
- A successful sign-up routes the user to a "Verify your email" instructional screen with copy explaining: *"Open the verification email we just sent to <email> and tap the link. This screen will close automatically once you've verified."*
- A duplicate email surfaces a non-blocking inline error on the sign-up screen.
- A password mismatch (or password below Supabase's minimum length) surfaces an inline error.
- The user opens the verification email in their mail app, taps the link, and the link opens the Stronger app already signed in — they land on the Workout/History tabs, **not** the sign-in screen and **not** the verification waiting screen.

Internal shape:

- The Expo project gets a custom URL scheme — `stronger` — declared in [app.json](app.json) under `expo.scheme`. (This produces `exp+stronger://...` in Expo Go and `stronger://...` in EAS builds; both are handled.)
- `expo-linking` is added and a listener is registered at app boot to receive incoming URLs of the form `stronger://auth/callback?...` (and the Expo Go variant).
- On receiving the callback URL, the app calls `supabase.auth.exchangeCodeForSession` (or the equivalent for the PKCE flow), which establishes the session and triggers the auth gate to flip to "signed in."
- The Supabase JS client is configured with `flowType: 'pkce'` if not already, and `redirectTo` pointing at `stronger://auth/callback`.

### HITL prerequisites (developer-user does these before merge)

1. In the Supabase dashboard: Authentication → URL Configuration → add both redirect URLs to the allowlist:
   - `stronger://auth/callback`
   - `exp+stronger://auth/callback`
2. Authentication → Email Templates → confirm the "Confirm signup" template's link target uses the redirect URL.

### Manual verification (HITL after merge)

The deep-link round-trip cannot be exercised in CI. The developer-user must verify by:

1. Signing up in-app with a real email address.
2. Confirming the "Verify your email" screen appears.
3. Opening the email on the same device, tapping the link.
4. Confirming the app foregrounds and the user is signed in (tabs visible).

## Acceptance criteria

- [ ] [app.json](app.json) declares `expo.scheme: "stronger"` (and `expo.ios.bundleIdentifier` / `expo.android.package` are unchanged from their current values).
- [ ] `expo-linking` is added as a dependency and a listener at app boot handles incoming URLs matching `stronger://auth/callback*` and `exp+stronger://auth/callback*`.
- [ ] The Supabase JS client is configured for the PKCE flow with the correct `redirectTo`.
- [ ] A sign-up screen exists with email + password + confirm-password fields and a submit button; submitting calls `supabase.auth.signUp` with the appropriate `emailRedirectTo`.
- [ ] A "Verify your email" screen exists with clear instructional copy.
- [ ] A successful in-app sign-up routes to the "Verify your email" screen.
- [ ] A duplicate-email error surfaces a non-blocking inline error on the sign-up screen.
- [ ] A password mismatch or sub-minimum-length password surfaces an inline error before the request is made.
- [ ] The sign-in screen has a discoverable affordance to navigate to the sign-up screen, and the sign-up screen has one to navigate back to sign-in.
- [ ] When the app receives a verification deep link, `exchangeCodeForSession` runs and the auth gate flips to signed-in without the user needing to re-enter credentials.
- [ ] If the deep link arrives while the app is closed, the app opens and signs the user in (cold-start path is handled, not just warm-start).
- [ ] **No regression** in any prior slice's behaviour: sign-in still works, sign-out still works, `workoutStore` and `persistence` remain unmodified.
- [ ] `npm test` and `npm run typecheck` pass.

## Blocked by

- [#16 Slice 1: Supabase bootstrap + auth gate (sign-in only)](https://github.com/Cmac2712/stronger/issues/16) — needs the `supabaseClient` and auth gate in place.

Can run in parallel with the sync-infrastructure slice (3) — they share no code.
