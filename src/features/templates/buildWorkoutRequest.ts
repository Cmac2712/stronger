// Pure builder for the AI-workout Claude request. SHARED WITH THE DENO EDGE
// FUNCTION (supabase/functions/generate-workout): every import reachable from
// this file must be a relative path with an explicit .ts extension — Deno
// resolves only those, while Metro/Jest accept literal paths and tsc allows
// them via allowImportingTsExtensions. No aliases, no React Native, no I/O.
import { getAll } from "../exercises/exerciseLibrary.ts";

// The fixed split set (PRD #39). templateLibrary (slice 1) should re-export
// from here once it lands so app UI and edge-function validation can't drift.
export const SPLITS = [
  "push",
  "pull",
  "legs",
  "upper",
  "lower",
  "full-body",
] as const;

export type Split = (typeof SPLITS)[number];

export function isSplit(value: unknown): value is Split {
  return (
    typeof value === "string" && (SPLITS as readonly string[]).includes(value)
  );
}

// Compact "favour what you do" payload the client sends for generation.
export type HistorySummaryEntry = {
  exerciseId: string;
  count: number; // sessions in which the exercise was performed with >=1 set
  lastPerformedAt: number; // startedAt (epoch ms) of the most recent of those
};

// The response schema's enum is derived from exerciseLibrary.getAll() at call
// time, so the model can only ever emit valid library ids (FK integrity at
// generation time) and a new library exercise widens AI selection with no
// prompt change.
export type WorkoutResponseSchema = {
  type: "object";
  additionalProperties: false;
  required: ["exerciseIds"];
  properties: {
    exerciseIds: {
      type: "array";
      items: { type: "string"; enum: string[] };
    };
  };
};

export type WorkoutRequest = {
  model: "claude-haiku-4-5";
  max_tokens: number;
  system: string;
  messages: [{ role: "user"; content: string }];
  output_config: {
    format: { type: "json_schema"; schema: WorkoutResponseSchema };
  };
};

const SPLIT_GUIDANCE: Record<Split, string> = {
  push: "chest, shoulders, and triceps (pressing movements)",
  pull: "back and biceps (pulling movements)",
  legs: "legs (squat, hinge, and accessory leg movements)",
  upper: "the whole upper body: chest, back, shoulders, and arms",
  lower: "the whole lower body: legs",
  "full-body": "the whole body across all muscle groups",
};

export function buildWorkoutRequest(input: {
  split: Split;
  summary: HistorySummaryEntry[];
}): WorkoutRequest {
  const exercises = getAll();

  const system = [
    "You are a strength-training coach generating a single gym session.",
    "Pick 4 to 6 exercises for the requested split, ordered compounds first.",
    "Strongly favour exercises the lifter already performs (their recent",
    "history is provided); fill gaps with sensible library picks.",
    "Only use exercise ids from this library (id | name | muscle group):",
    ...exercises.map((e) => `${e.id} | ${e.name} | ${e.muscleGroup}`),
  ].join("\n");

  const content = [
    `Split: ${input.split} — target ${SPLIT_GUIDANCE[input.split]}.`,
    "Recent history as JSON ({exerciseId, count, lastPerformedAt}, most-trained first):",
    JSON.stringify(input.summary),
  ].join("\n");

  return {
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    system,
    messages: [{ role: "user", content }],
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["exerciseIds"],
          properties: {
            exerciseIds: {
              type: "array",
              items: { type: "string", enum: exercises.map((e) => e.id) },
            },
          },
        },
      },
    },
  };
}
