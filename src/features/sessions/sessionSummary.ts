import { Session, Set } from "@shared/types";
import { pickTopSet } from "@state/workoutStore";

export type ExerciseSummary = {
  exerciseId: string;
  setCount: number;
  // The exercise's best set this session: highest weight, ties by reps
  // descending, then setNumber descending (pickTopSet's definition).
  topSet: Set;
};

export type SessionSummary = {
  durationMs: number;
  totalSets: number;
  // Exercises with ≥1 logged set, in the order they appear in the session.
  exercises: ExerciseSummary[];
};

// Pure derivation of the workout-complete summary from an ended session.
// Duplicate session exercises of the same exercise fold into one row (their
// sets merge), matching how per-exercise history reads a session.
export function summarizeSession(session: Session): SessionSummary {
  const setsByExercise = new Map<string, Set[]>();
  for (const se of [...session.sessionExercises].sort(
    (a, b) => a.order - b.order
  )) {
    if (se.sets.length === 0) continue;
    const sets = setsByExercise.get(se.exerciseId) ?? [];
    setsByExercise.set(se.exerciseId, [...sets, ...se.sets]);
  }

  const exercises = [...setsByExercise.entries()].map(
    ([exerciseId, sets]) => ({
      exerciseId,
      setCount: sets.length,
      topSet: pickTopSet(sets)!,
    })
  );

  return {
    durationMs: (session.endedAt ?? session.startedAt) - session.startedAt,
    totalSets: exercises.reduce((sum, e) => sum + e.setCount, 0),
    exercises,
  };
}
