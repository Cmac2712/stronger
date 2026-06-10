// A rest-between-sets countdown modelled as pure state transitions. Remaining
// time is computed from a target timestamp (endsAt) rather than a ticking
// counter, so the timer stays correct across app background/foreground and tab
// switches where a JS interval may stall or be discarded.
export type RestTimer =
  | { status: "idle"; durationMs: number }
  | { status: "running"; endsAt: number; durationMs: number }
  | { status: "paused"; remainingMs: number; durationMs: number };

export function startRest(durationMs: number, now: number): RestTimer {
  return { status: "running", endsAt: now + durationMs, durationMs };
}

export function pauseRest(timer: RestTimer, now: number): RestTimer {
  if (timer.status !== "running") return timer;
  return {
    status: "paused",
    remainingMs: Math.max(0, timer.endsAt - now),
    durationMs: timer.durationMs,
  };
}

export function resumeRest(timer: RestTimer, now: number): RestTimer {
  if (timer.status !== "paused") return timer;
  return {
    status: "running",
    endsAt: now + timer.remainingMs,
    durationMs: timer.durationMs,
  };
}

// Reset always restarts a fresh countdown from the timer's configured duration,
// regardless of current status.
export function resetRest(timer: RestTimer, now: number): RestTimer {
  return startRest(timer.durationMs, now);
}

export function restRemainingMs(timer: RestTimer, now: number): number {
  switch (timer.status) {
    case "running":
      return Math.max(0, timer.endsAt - now);
    case "paused":
      return timer.remainingMs;
    case "idle":
      return 0;
  }
}

export function isRestExpired(timer: RestTimer, now: number): boolean {
  return timer.status === "running" && now >= timer.endsAt;
}
