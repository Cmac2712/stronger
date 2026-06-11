import type { Session } from "@shared/types";
import type { HistorySummaryEntry } from "./buildWorkoutRequest";

// Summarizes session history into the compact payload sent for AI workout
// generation: one entry per exercise that was actually performed (>=1 set),
// with how many sessions it appeared in and when it was last performed.
// Ordering is deterministic — most-performed first, then most recent, then
// exerciseId — so the prompt (and its cache key) is stable for equal history.
export function historySummary(sessions: Session[]): HistorySummaryEntry[] {
  const byExercise = new Map<string, HistorySummaryEntry>();

  for (const session of sessions) {
    for (const sessionExercise of session.sessionExercises) {
      if (sessionExercise.sets.length === 0) continue;
      const existing = byExercise.get(sessionExercise.exerciseId);
      if (existing) {
        existing.count += 1;
        existing.lastPerformedAt = Math.max(
          existing.lastPerformedAt,
          session.startedAt
        );
      } else {
        byExercise.set(sessionExercise.exerciseId, {
          exerciseId: sessionExercise.exerciseId,
          count: 1,
          lastPerformedAt: session.startedAt,
        });
      }
    }
  }

  return [...byExercise.values()].sort(
    (a, b) =>
      b.count - a.count ||
      b.lastPerformedAt - a.lastPerformedAt ||
      a.exerciseId.localeCompare(b.exerciseId)
  );
}
