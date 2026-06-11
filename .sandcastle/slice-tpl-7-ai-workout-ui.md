## Parent

#39

## What to build

The user-facing **AI workout** path on the launch screen: pick a split, generate, and go straight into the session.

Add an **AI workout** option to the idle launch screen. Tapping it shows `AiSplitPicker` — a single-choice picker over the six splits (Push / Pull / Legs / Upper / Lower / Full body), the only question asked. On choice, `requestAiWorkout(split)` assembles the history summary from the store and calls the deployed function with the user's JWT. On success the returned `exerciseIds` are passed to `applyTemplate` and the session starts immediately ("generate-and-go"). On failure or timeout, surface a clear error and start **nothing** — a session is created only after a valid exercise list comes back, so a failed generation never leaves a half-started session.

The AI workout option is **disabled when offline** with a hint explaining why (it is the only feature that requires network). Resolve which signal gates "offline": there is currently no dedicated connectivity signal, only the sync-status (`paused`) listener — pick or introduce the right one and note the choice.

Per the AI-e2e decision, cover this with component/unit tests that mock the function client (no live model call in CI); live behaviour is verified in the deploy slice.

## Acceptance criteria

- [ ] The launch screen shows an AI workout option alongside Start Workout and the template sections
- [ ] Selecting a split triggers generation and, on success, starts a session with the generated exercises immediately (no extra confirmation step)
- [ ] On generation failure/timeout, a clear error is shown and no session is created (no half-started state)
- [ ] The AI option is disabled offline with a hint; the gating signal is chosen and documented
- [ ] `requestAiWorkout` sends the split + history summary with the JWT and returns the exercise ids
- [ ] Tests mock the function client (no live network) and cover success, failure, and offline-disabled states
- [ ] Green gate: typecheck + jest + e2e:smoke

## Blocked by

- #40 (`applyTemplate` + the launch screen)
- #44 (the AI generation core / function contract + `historySummary`)
- #45 (the deployed function this calls live)
