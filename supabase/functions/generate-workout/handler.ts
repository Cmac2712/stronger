// Runtime-agnostic core of the generate-workout edge function. Plain data in,
// plain data out — no Deno globals, no Anthropic/Supabase SDKs — so jest can
// drive it against mocked deps while index.ts adapts it to Deno.serve.
// Imports into src/ carry explicit .ts extensions for Deno (see
// buildWorkoutRequest.ts header).
import {
  buildWorkoutRequest,
  isSplit,
  HistorySummaryEntry,
  Split,
  WorkoutRequest,
} from "../../../src/features/templates/buildWorkoutRequest.ts";

// Minimal slice of an Anthropic Message — all the handler reads back.
export type ModelMessage = {
  content: { type: string; text?: string }[];
};

export type GenerateWorkoutDeps = {
  // Resolves a Supabase JWT to a user, or null if the token is invalid.
  getUser: (jwt: string) => Promise<{ id: string } | null>;
  // anthropic.messages.create with the key held by the caller.
  createMessage: (request: WorkoutRequest) => Promise<ModelMessage>;
};

export type GenerateWorkoutResult =
  | { status: 200; body: { exerciseIds: string[] } }
  | { status: 400 | 401 | 502; body: { error: string } };

function parseBearer(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

function isSummaryEntry(value: unknown): value is HistorySummaryEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.exerciseId === "string" &&
    typeof entry.count === "number" &&
    typeof entry.lastPerformedAt === "number"
  );
}

function parseBody(
  body: unknown
): { split: Split; summary: HistorySummaryEntry[] } | null {
  if (typeof body !== "object" || body === null) return null;
  const { split, summary } = body as Record<string, unknown>;
  if (!isSplit(split)) return null;
  if (!Array.isArray(summary) || !summary.every(isSummaryEntry)) return null;
  return { split, summary };
}

// The schema enum guarantees ids are valid library ids; this only guards
// against a response that doesn't match the schema shape at all.
function extractExerciseIds(message: ModelMessage): string[] | null {
  const text = message.content.find((b) => b.type === "text")?.text;
  if (typeof text !== "string") return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const { exerciseIds } = parsed as Record<string, unknown>;
  if (
    !Array.isArray(exerciseIds) ||
    !exerciseIds.every((id) => typeof id === "string")
  ) {
    return null;
  }
  return exerciseIds;
}

export async function handleGenerateWorkout(
  input: { authHeader: string | null; body: unknown },
  deps: GenerateWorkoutDeps
): Promise<GenerateWorkoutResult> {
  const jwt = parseBearer(input.authHeader);
  if (!jwt) {
    return { status: 401, body: { error: "Missing bearer token" } };
  }
  if ((await deps.getUser(jwt)) === null) {
    return { status: 401, body: { error: "Invalid token" } };
  }

  const parsed = parseBody(input.body);
  if (!parsed) {
    return {
      status: 400,
      body: { error: "Expected { split: Split, summary: HistorySummaryEntry[] }" },
    };
  }

  let message: ModelMessage;
  try {
    message = await deps.createMessage(buildWorkoutRequest(parsed));
  } catch {
    return { status: 502, body: { error: "Generation failed" } };
  }

  const exerciseIds = extractExerciseIds(message);
  if (exerciseIds === null) {
    return { status: 502, body: { error: "Malformed generation response" } };
  }
  return { status: 200, body: { exerciseIds } };
}
