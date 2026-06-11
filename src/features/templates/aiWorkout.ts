// Client for the deployed generate-workout edge function: pick a split, send
// the history summary with the user's JWT, get back library exercise ids.
// Generate-and-go (startAiWorkout) applies them via applyTemplate — a session
// is created only AFTER a valid exercise list comes back, so a failed or
// timed-out generation never leaves a half-started session.
//
// Offline gating: requestAiWorkout guards on @sync/connectivity (the OS
// network state via expo-network), not the sync-status "paused" signal —
// paused means the mutation queue hit an auth error, which says nothing about
// connectivity. See connectivity.ts for the full rationale.
import type { Session } from "@shared/types";
import { historySummary } from "./historySummary";
import type { HistorySummaryEntry, Split } from "./buildWorkoutRequest";

export type AiWorkoutErrorKind = "offline" | "timeout" | "generation";

// Every failure path surfaces as one of three kinds, each carrying a
// user-facing message the launch screen can render directly.
export class AiWorkoutError extends Error {
  readonly kind: AiWorkoutErrorKind;

  constructor(kind: AiWorkoutErrorKind, message: string) {
    super(message);
    this.name = "AiWorkoutError";
    this.kind = kind;
  }
}

export type GenerateWorkoutBody = {
  split: Split;
  summary: HistorySummaryEntry[];
};

// Shape of supabase.functions.invoke's settled value — the seam tests mock.
export type InvokeGenerateWorkout = (
  body: GenerateWorkoutBody
) => Promise<{ data: unknown; error: { message?: string } | null }>;

export type AiWorkoutDeps = {
  isOnline: () => boolean;
  getSessions: () => Session[];
  invoke: InvokeGenerateWorkout;
  applyTemplate: (exerciseIds: string[]) => void;
  timeoutMs?: number;
};

// Generous enough for a cold function start + Haiku, short enough that the
// user isn't staring at a spinner past the point of giving up.
export const AI_WORKOUT_TIMEOUT_MS = 20_000;

// require() at call time (the workoutStore pattern): the Supabase client and
// store load only when the real deps are actually used, never via a mere
// import in jest — tests always inject their own deps.
const loadConnectivity = (): typeof import("@sync/connectivity") =>
  require("@sync/connectivity");
const loadSupabase = (): typeof import("@sync/supabaseClient") =>
  require("@sync/supabaseClient");
const loadWorkoutStore = (): typeof import("@state/workoutStore") =>
  require("@state/workoutStore");

function defaultDeps(): AiWorkoutDeps {
  return {
    isOnline: () => loadConnectivity().isOnline(),
    // The AI option is only offered when idle, so history is every session.
    getSessions: () => loadWorkoutStore().workoutStore.getState().history,
    invoke: async (body) => {
      const { supabase } = loadSupabase();
      if (!supabase) {
        return { data: null, error: { message: "Supabase not configured" } };
      }
      // invoke() sends the signed-in user's JWT as the Authorization header.
      return supabase.functions.invoke("generate-workout", { body });
    },
    applyTemplate: (exerciseIds) =>
      loadWorkoutStore().workoutStore.getState().applyTemplate(exerciseIds),
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new AiWorkoutError("timeout", "Generation timed out. Please try again.")
      );
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

// The schema enum already guarantees ids are valid library ids (ADR-0007);
// this only guards the overall shape — and rejects an empty list, because
// generate-and-go with zero exercises is just a confusing empty session.
function parseExerciseIds(data: unknown): string[] | null {
  if (typeof data !== "object" || data === null) return null;
  const { exerciseIds } = data as Record<string, unknown>;
  if (
    !Array.isArray(exerciseIds) ||
    exerciseIds.length === 0 ||
    !exerciseIds.every((id) => typeof id === "string")
  ) {
    return null;
  }
  return exerciseIds;
}

export async function requestAiWorkout(
  split: Split,
  deps: AiWorkoutDeps = defaultDeps()
): Promise<string[]> {
  if (!deps.isOnline()) {
    throw new AiWorkoutError(
      "offline",
      "AI workout needs an internet connection."
    );
  }

  const body: GenerateWorkoutBody = {
    split,
    summary: historySummary(deps.getSessions()),
  };

  let result: Awaited<ReturnType<InvokeGenerateWorkout>>;
  try {
    result = await withTimeout(
      deps.invoke(body),
      deps.timeoutMs ?? AI_WORKOUT_TIMEOUT_MS
    );
  } catch (error) {
    if (error instanceof AiWorkoutError) throw error;
    throw new AiWorkoutError(
      "generation",
      "Couldn't generate a workout. Please try again."
    );
  }

  const exerciseIds = result.error ? null : parseExerciseIds(result.data);
  if (exerciseIds === null) {
    throw new AiWorkoutError(
      "generation",
      "Couldn't generate a workout. Please try again."
    );
  }
  return exerciseIds;
}

// Generate-and-go: the session starts immediately on success, and only then.
export async function startAiWorkout(
  split: Split,
  deps: AiWorkoutDeps = defaultDeps()
): Promise<void> {
  const exerciseIds = await requestAiWorkout(split, deps);
  deps.applyTemplate(exerciseIds);
}
