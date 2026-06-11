// Pure derivation of a user template from a finished session (PRD #39): the
// distinct exercises actually performed (≥1 set), in first-appearance order,
// plus a default name from their dominant muscle group(s). No I/O.

import type { Session } from "@shared/types";
import * as exerciseLibrary from "@features/exercises/exerciseLibrary";
import type { MuscleGroup } from "@features/exercises/exerciseLibrary";

// Fallback when no exercise resolves to a muscle group (empty session, or
// every id has left the library).
const GENERIC_NAME = "Workout";

function capitalize(group: MuscleGroup): string {
  return group.charAt(0).toUpperCase() + group.slice(1);
}

export function templateFromSession(session: Session): {
  name: string;
  exerciseIds: string[];
} {
  const performed = [...session.sessionExercises]
    .sort((a, b) => a.order - b.order)
    .filter((se) => se.sets.length > 0);

  const exerciseIds: string[] = [];
  for (const se of performed) {
    if (!exerciseIds.includes(se.exerciseId)) exerciseIds.push(se.exerciseId);
  }

  // Count distinct exercises per muscle group; ids that no longer resolve in
  // the library stay in the template but cannot vote on the name.
  const counts = new Map<MuscleGroup, number>();
  for (const id of exerciseIds) {
    const group = exerciseLibrary.getById(id)?.muscleGroup;
    if (group) counts.set(group, (counts.get(group) ?? 0) + 1);
  }

  const max = Math.max(0, ...counts.values());
  if (max === 0) return { name: GENERIC_NAME, exerciseIds };

  // Map insertion order is first-appearance order, so tied groups read in the
  // order they were trained (e.g. "Chest & Back").
  const dominant = [...counts.entries()]
    .filter(([, count]) => count === max)
    .map(([group]) => capitalize(group));

  return { name: dominant.join(" & "), exerciseIds };
}
