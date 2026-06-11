# Maestro E2E flows

End-to-end tests that drive the **built app** (`com.workout.app`), not Expo Go.
Maestro launches a real binary, so you must install a dev/preview build first.

## Flows

| File | Backend? | Covers |
| --- | --- | --- |
| `auth/sign-up-validation.yaml` | no | empty email / mismatch / too-short password |
| `auth/navigation.yaml` | no | sign-in ⇆ sign-up toggle |
| `auth/sign-in-success.yaml` | yes | pre-confirmed user → main app |
| `auth/sign-in-wrong-password.yaml` | yes | wrong password → error surfaced |
| `auth/sign-up-shows-verify.yaml` | yes | new email → "Check your email" screen |
| `templates/builtin-apply.yaml` | yes | idle launch screen → tap builtin template → prefilled session |
| `workout/complete-summary.yaml` | yes | non-empty workout → summary → Done → idle; empty skips |
| `subflows/open-fresh.yaml` | — | shared: clean launch → wait for sign-in |
| `subflows/signed-in.yaml` | yes | shared: clean launch → sign in → main app |

The two `no-backend` flows are fully deterministic and the recommended smoke set.

## Prerequisites

1. **Maestro CLI** — `curl -fsSL https://get.maestro.mobile.dev | bash`
2. **The app installed** on an emulator/device. Use a preview build (Expo Go won't work):
   ```bash
   npm run build:android:run     # installs the latest EAS preview build
   # or, after downloading an APK:  adb install -r app.apk
   ```
3. **A dedicated test Supabase project** (NOT production) for the `backend` flows.
   Point the installed build at it via an EAS env/build profile
   (`EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`).

## Seed a pre-confirmed test user (for the `backend` flows)

```bash
TEST_EMAIL=e2e@example.com TEST_PASSWORD=test123456 \
E2E_SUPABASE_URL=https://<test-project>.supabase.co \
E2E_SUPABASE_SERVICE_KEY=<test-project-service-role-key> \
node scripts/e2e-seed-user.mjs
```

`email_confirm: true` means the user skips the verify-email step, so sign-in works
without an inbox. For `sign-up-shows-verify.yaml`, keep **email confirmation enabled**
in the test project's Auth settings.

## Run

```bash
# No-backend smoke set (no env needed):
npm run e2e:smoke

# Everything (sign-in flows need credentials):
npm run e2e -- -e TEST_EMAIL=e2e@example.com -e TEST_PASSWORD=test123456
```

## Adding more flows

Reuse `subflows/open-fresh.yaml` (auth screens) or `subflows/signed-in.yaml`
(anything behind the auth gate) as the first step. Prefer `id:` (testID)
selectors over visible text. testIDs currently wired: `email-input`,
`password-input`, `confirm-password-input`, `toggle-password-visibility`
(sign-in), `signin-submit`, `signup-submit`, `goto-signup`, `goto-signin`,
`auth-error`, `verify-email-screen`, `tab-workout`, `tab-history`,
`start-workout`, `end-workout`, `workout-complete-screen`,
`workout-complete-done`, `template-<id>` (e.g. `template-builtin-push`).
