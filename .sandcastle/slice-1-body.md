# Slice 1: Supabase bootstrap + auth gate (sign-in only)

## Parent

[#15 PRD: Slice 2 — Supabase sync and multi-device persistence](https://github.com/Cmac2712/stronger/issues/15)

Supporting docs: [CONTEXT.md](CONTEXT.md), [docs/adr/0001-supabase-sync-architecture.md](docs/adr/0001-supabase-sync-architecture.md), [docs/adr/0002-email-password-auth-with-verification.md](docs/adr/0002-email-password-auth-with-verification.md).

## What to build

The thinnest end-to-end Supabase tracer through the auth path: sign in with a dashboard-created account, see the app, sign out, sign back in, have the session survive an app restart. **No data sync happens in this slice** — the local `persistence` module continues to drive `workoutStore` and the UI exactly as it does today. This slice exists only to wire up the Supabase client, prove session persistence works, and put the auth gate around the navigator so subsequent slices have something to hang sync on.

User-facing behaviour after merge:

- Launching the app while signed out shows a sign-in screen (email + password).
- A correct sign-in puts the user into the existing Workout/History tabs.
- An incorrect sign-in surfaces a clear error in the form, leaves the user on the sign-in screen.
- A sign-out button (placed on the Workout idle screen and the active-session screen footer) signs the user out and returns them to the sign-in screen.
- Closing and reopening the app while signed in does **not** require re-authentication.

Internal shape:

- A single `supabaseClient` singleton, configured with Supabase URL + anon key from environment variables, with `auth.storage` pointed at AsyncStorage so the session JWT persists across launches.
- An auth gate at the top of the navigator that branches on `supabase.auth.getSession()` / `onAuthStateChange`: signed-out → sign-in screen; signed-in → existing tabs.
- No new tables, no migrations, no sync code in this slice.

### HITL prerequisites (developer-user does these before the AFK agent picks the issue up)

1. Create a Supabase project at supabase.com.
2. Project Settings → API → copy Project URL and `anon` public key.
3. Append to [.env](.env) (already gitignored):
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
4. Authentication → Providers → Email: ensure email/password is enabled. Leave email verification ON (slice 2 wires up the redirect; until then, dashboard-created users bypass verification).
5. Authentication → Users → invite or create the developer-user's account so there's a working credential to sign in with.

The AFK agent should refuse to proceed (and surface a clear error) if the env vars are missing.

## Acceptance criteria

- [ ] `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are read from the environment via Expo's standard config mechanism; the bare strings do not appear hardcoded anywhere.
- [ ] A single configured Supabase JS client is exported from a `supabaseClient` module; AsyncStorage is its session storage backend.
- [ ] A sign-in screen exists with email field, password field, and a submit button; submitting calls `supabase.auth.signInWithPassword`.
- [ ] Invalid credentials surface a non-blocking inline error on the sign-in screen.
- [ ] A sign-out affordance is reachable from both the Workout idle screen and the active-session screen footer; tapping it calls `supabase.auth.signOut` and routes the user back to the sign-in screen.
- [ ] The root navigator is gated on auth state: signed-out → sign-in screen; signed-in → existing Workout/History tabs.
- [ ] Closing and reopening the app while signed in lands directly on the tabs (no sign-in screen flash beyond an initial loading state).
- [ ] **No regression** in `workoutStore` behaviour: existing AsyncStorage drives the UI; `persistence` module is unmodified; `types.ts` is unmodified; all existing tests in [src/store/workoutStore.test.ts](src/store/workoutStore.test.ts) and [src/persistence/persistence.test.ts](src/persistence/persistence.test.ts) pass unchanged.
- [ ] `npm test` and `npm run typecheck` pass.
- [ ] The new auth screens are styled with NativeWind in the same primitive-RN-component style as the rest of the app — no new component library.
- [ ] If `EXPO_PUBLIC_SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_ANON_KEY` is missing at runtime, the app surfaces a clear developer-facing error rather than crashing silently.

## Blocked by

None — can start immediately once the HITL prerequisites above are completed.
