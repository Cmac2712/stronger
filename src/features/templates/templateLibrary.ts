// Builtin workout templates. Hardcoded and read-only, mirroring
// exerciseLibrary: the shape accommodates user templates in a later slice
// without a schema change. exerciseIds reference exerciseLibrary ids —
// FK integrity is guarded by templateLibrary.test.ts.

export type Template = {
  id: string;
  name: string;
  exerciseIds: string[]; // ordered FKs into exerciseLibrary
};

// The fixed set of training splits, for AI workout generation (later slice).
export const SPLITS = [
  "Push",
  "Pull",
  "Legs",
  "Upper",
  "Lower",
  "Full body",
] as const;

export type Split = (typeof SPLITS)[number];

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
