export type MuscleGroup =
  | "chest"
  | "back"
  | "legs"
  | "shoulders"
  | "arms"
  | "core";

export type Exercise = {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
};

// Display order for grouped views (picker section headers).
export const MUSCLE_GROUPS: MuscleGroup[] = [
  "chest",
  "back",
  "legs",
  "shoulders",
  "arms",
  "core",
];

// Curated, read-only library. The shape accommodates user-added exercises in
// a future slice without a schema change.
const EXERCISES: Exercise[] = [
  // chest
  { id: "barbell-bench-press", name: "Barbell Bench Press", muscleGroup: "chest" },
  { id: "incline-barbell-bench-press", name: "Incline Barbell Bench Press", muscleGroup: "chest" },
  { id: "dumbbell-bench-press", name: "Dumbbell Bench Press", muscleGroup: "chest" },
  { id: "incline-dumbbell-press", name: "Incline Dumbbell Press", muscleGroup: "chest" },
  { id: "machine-chest-press", name: "Machine Chest Press", muscleGroup: "chest" },
  { id: "pec-deck-fly", name: "Pec Deck Fly", muscleGroup: "chest" },
  { id: "cable-crossover", name: "Cable Crossover", muscleGroup: "chest" },
  { id: "push-up", name: "Push-Up", muscleGroup: "chest" },

  // back
  { id: "deadlift", name: "Deadlift", muscleGroup: "back" },
  { id: "barbell-row", name: "Barbell Row", muscleGroup: "back" },
  { id: "dumbbell-row", name: "Dumbbell Row", muscleGroup: "back" },
  { id: "lat-pulldown", name: "Lat Pulldown", muscleGroup: "back" },
  { id: "seated-cable-row", name: "Seated Cable Row", muscleGroup: "back" },
  { id: "pull-up", name: "Pull-Up", muscleGroup: "back" },
  { id: "chin-up", name: "Chin-Up", muscleGroup: "back" },
  { id: "t-bar-row", name: "T-Bar Row", muscleGroup: "back" },

  // legs
  { id: "barbell-back-squat", name: "Barbell Back Squat", muscleGroup: "legs" },
  { id: "front-squat", name: "Front Squat", muscleGroup: "legs" },
  { id: "romanian-deadlift", name: "Romanian Deadlift", muscleGroup: "legs" },
  { id: "leg-press", name: "Leg Press", muscleGroup: "legs" },
  { id: "leg-extension", name: "Leg Extension", muscleGroup: "legs" },
  { id: "lying-leg-curl", name: "Lying Leg Curl", muscleGroup: "legs" },
  { id: "walking-lunge", name: "Walking Lunge", muscleGroup: "legs" },
  { id: "bulgarian-split-squat", name: "Bulgarian Split Squat", muscleGroup: "legs" },
  { id: "standing-calf-raise", name: "Standing Calf Raise", muscleGroup: "legs" },

  // shoulders
  { id: "overhead-press", name: "Overhead Press", muscleGroup: "shoulders" },
  { id: "seated-dumbbell-press", name: "Seated Dumbbell Press", muscleGroup: "shoulders" },
  { id: "arnold-press", name: "Arnold Press", muscleGroup: "shoulders" },
  { id: "dumbbell-lateral-raise", name: "Dumbbell Lateral Raise", muscleGroup: "shoulders" },
  { id: "rear-delt-fly", name: "Rear Delt Fly", muscleGroup: "shoulders" },
  { id: "face-pull", name: "Face Pull", muscleGroup: "shoulders" },
  { id: "barbell-shrug", name: "Barbell Shrug", muscleGroup: "shoulders" },

  // arms
  { id: "barbell-curl", name: "Barbell Curl", muscleGroup: "arms" },
  { id: "dumbbell-curl", name: "Dumbbell Curl", muscleGroup: "arms" },
  { id: "hammer-curl", name: "Hammer Curl", muscleGroup: "arms" },
  { id: "preacher-curl", name: "Preacher Curl", muscleGroup: "arms" },
  { id: "triceps-pushdown", name: "Triceps Pushdown", muscleGroup: "arms" },
  { id: "overhead-triceps-extension", name: "Overhead Triceps Extension", muscleGroup: "arms" },
  { id: "skullcrusher", name: "Skullcrusher", muscleGroup: "arms" },
  { id: "dip", name: "Dip", muscleGroup: "arms" },

  // core
  { id: "plank", name: "Plank", muscleGroup: "core" },
  { id: "hanging-leg-raise", name: "Hanging Leg Raise", muscleGroup: "core" },
  { id: "cable-crunch", name: "Cable Crunch", muscleGroup: "core" },
  { id: "russian-twist", name: "Russian Twist", muscleGroup: "core" },
  { id: "ab-wheel-rollout", name: "Ab Wheel Rollout", muscleGroup: "core" },
  { id: "back-extension", name: "Back Extension", muscleGroup: "core" },
];

export function getAll(): Exercise[] {
  return EXERCISES;
}

export function getById(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id);
}
