// Builtin workout templates. Hardcoded and read-only, mirroring
// exerciseLibrary: the shape accommodates user templates in a later slice
// without a schema change. exerciseIds reference exerciseLibrary ids —
// FK integrity is guarded by templateLibrary.test.ts.

// The Template type lives in @shared/types now that PersistedState carries
// user templates; re-exported here so template-feature code has one import.
export type { Template } from "@shared/types";
import type { Template } from "@shared/types";

// The canonical Split set lives in buildWorkoutRequest (shared with the Deno
// edge function, which validates incoming splits against it); re-export it so
// app UI and edge-function validation cannot drift.
export { SPLITS, isSplit } from "./buildWorkoutRequest";
export type { Split } from "./buildWorkoutRequest";

import type { Split } from "./buildWorkoutRequest";

// UI display names for the canonical lowercase split ids.
export const SPLIT_LABELS: Record<Split, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  upper: "Upper",
  lower: "Lower",
  "full-body": "Full body",
};

// Ids are stable, namespaced strings — they may end up persisted (e.g. in
// analytics or future references), so never rename or reuse them.
const TEMPLATES: Template[] = [
  {
    id: "builtin-push",
    name: "Push",
    exerciseIds: [
      "barbell-bench-press",
      "overhead-press",
      "incline-dumbbell-press",
      "dumbbell-lateral-raise",
      "triceps-pushdown",
    ],
  },
  {
    id: "builtin-pull",
    name: "Pull",
    exerciseIds: [
      "deadlift",
      "lat-pulldown",
      "barbell-row",
      "face-pull",
      "barbell-curl",
    ],
  },
  {
    id: "builtin-legs",
    name: "Legs",
    exerciseIds: [
      "barbell-back-squat",
      "romanian-deadlift",
      "leg-press",
      "lying-leg-curl",
      "standing-calf-raise",
    ],
  },
];

export function getAll(): Template[] {
  return TEMPLATES;
}

export function getById(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
