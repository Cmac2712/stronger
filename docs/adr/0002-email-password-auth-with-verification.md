# Email/password auth with verification and deep-link redirect

Auth's job in this app is purely identity portability across devices for one human — not multi-tenancy, not social, not coaching. We chose email/password with an in-app sign-up flow, email verification on, and a custom deep-link scheme for the verification redirect (`stronger://auth/callback`) handled via `expo-linking` + `supabase.auth.exchangeCodeForSession`. Session JWTs persist across app launches via Supabase's storage adapter pointed at AsyncStorage.

Verification ON was chosen against the recommendation: for a project where the only user is the developer, "off" was the lower-friction default and verification protects against a threat (typo'd or fake addresses) that doesn't apply. Recording the decision here so a future reader doesn't see the deep-link plumbing and assume it's vestigial.

## Considered options

- **Magic link.** Lower steady-state friction, but signing back in from the gym means swapping to the mail app — exactly the friction Slice 0's UX bar was designed to eliminate. Also needs the same deep-link plumbing we ended up needing anyway. Rejected.
- **OAuth (Google/Apple).** One-tap once configured, but configuring in Expo Go requires `expo-auth-session` plumbing or a custom dev build — bumps against the PRD constraint that "everything must be supported by Expo Go without a custom dev build." Rejected.
- **Anonymous (`signInAnonymously`).** Friction-free but device-scoped: signing in on a second device creates a *second* anon user, breaking the multi-device sync requirement that motivated adding a backend at all. Rejected.
- **Email/password with verification OFF.** Recommended, but the user chose ON. The trade-off: deep-link plumbing + an Expo-Go-vs-EAS-build scheme footgun in exchange for catching nonexistent addresses on sign-up.
- **Dashboard-created account, no in-app sign-up flow.** Halves the auth UI work. Rejected because the user wants the sign-up flow.

## Consequences

- [app.json](../../app.json) needs a `scheme` (e.g. `"stronger"`). During Expo Go development the effective scheme becomes `exp+stronger://`; in EAS builds it's the bare `stronger://`. This dual-mode is the footgun to watch for when verification emails are tested.
- The Supabase project's redirect URL allowlist must include both the dev and prod schemes.
- Sign-up is open: anyone with the Supabase project URL can create an account. RLS scopes them to their own rows, so they can't see the developer's data — but `auth.users` will contain their entries. Rate limits stay at Supabase defaults; revisit if junk accounts become a problem (toggle: turn verification's value up by adding an allowlist trigger, or restrict signups).
- A 401 from Supabase during queue drain (expired session) is a recoverable "sync paused, please sign in again" state, not a destructive error — the queue persists and resumes after re-auth.
