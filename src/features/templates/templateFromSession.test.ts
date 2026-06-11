import { templateFromSession } from "./templateFromSession";
import type { Session, SessionExercise } from "@shared/types";

// Library facts the cases below rely on (guarded by exerciseLibrary itself):
// barbell-bench-press/incline-dumbbell-press → chest, deadlift/barbell-row →
// back, barbell-back-squat/leg-press → legs, overhead-press → shoulders.

let nextId = 0;
function se(exerciseId: string, setCount: number, order: number): SessionExercise {
  return {
    id: `se-${nextId++}`,
    exerciseId,
    order,
    sets: Array.from({ length: setCount }, (_, i) => ({
      id: `set-${nextId}-${i}`,
      setNumber: i + 1,
      reps: 8,
      weight: 80,
    })),
  };
}

function session(exercises: SessionExercise[]): Session {
  return { id: "s-1", startedAt: 1000, endedAt: 2000, sessionExercises: exercises };
}

describe("templateFromSession", () => {
  const cases: Array<{
    label: string;
    exercises: SessionExercise[];
    expected: { name: string; exerciseIds: string[] };
  }> = [
    {
      label: "empty session falls back to the generic name",
      exercises: [],
      expected: { name: "Workout", exerciseIds: [] },
    },
    {
      label: "exercises with zero sets are dropped",
      exercises: [
        se("barbell-bench-press", 3, 0),
        se("barbell-back-squat", 0, 1),
        se("incline-dumbbell-press", 2, 2),
      ],
      expected: {
        name: "Chest",
        exerciseIds: ["barbell-bench-press", "incline-dumbbell-press"],
      },
    },
    {
      label: "a session whose every exercise has zero sets is treated as empty",
      exercises: [se("barbell-bench-press", 0, 0), se("deadlift", 0, 1)],
      expected: { name: "Workout", exerciseIds: [] },
    },
    {
      label: "single dominant group names the template after it",
      exercises: [
        se("barbell-bench-press", 3, 0),
        se("incline-dumbbell-press", 3, 1),
        se("overhead-press", 2, 2),
      ],
      expected: {
        name: "Chest",
        exerciseIds: [
          "barbell-bench-press",
          "incline-dumbbell-press",
          "overhead-press",
        ],
      },
    },
    {
      label: "tied groups join with an ampersand, in first-appearance order",
      exercises: [se("barbell-bench-press", 3, 0), se("deadlift", 3, 1)],
      expected: {
        name: "Chest & Back",
        exerciseIds: ["barbell-bench-press", "deadlift"],
      },
    },
    {
      label: "single-group session (all legs)",
      exercises: [se("barbell-back-squat", 3, 0), se("leg-press", 3, 1)],
      expected: {
        name: "Legs",
        exerciseIds: ["barbell-back-squat", "leg-press"],
      },
    },
    {
      label: "duplicate exercise ids collapse to one, keeping first appearance",
      exercises: [
        se("barbell-bench-press", 2, 0),
        se("deadlift", 2, 1),
        se("barbell-bench-press", 1, 2),
      ],
      expected: {
        name: "Chest & Back",
        exerciseIds: ["barbell-bench-press", "deadlift"],
      },
    },
    {
      label: "first-appearance order follows the order field, not array position",
      exercises: [
        se("deadlift", 2, 1),
        se("barbell-bench-press", 2, 0),
        se("barbell-row", 2, 2),
      ],
      expected: {
        name: "Back",
        exerciseIds: ["barbell-bench-press", "deadlift", "barbell-row"],
      },
    },
    {
      label: "an id missing from the library is kept but ignored for naming",
      exercises: [se("retired-exercise", 3, 0), se("deadlift", 1, 1)],
      expected: {
        name: "Back",
        exerciseIds: ["retired-exercise", "deadlift"],
      },
    },
    {
      label: "a session of only unresolved ids falls back to the generic name",
      exercises: [se("retired-exercise", 3, 0)],
      expected: { name: "Workout", exerciseIds: ["retired-exercise"] },
    },
  ];

  it.each(cases)("$label", ({ exercises, expected }) => {
    expect(templateFromSession(session(exercises))).toEqual(expected);
  });
});
