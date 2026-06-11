import { StoreApi } from "zustand/vanilla";
import { createWorkoutStore, WorkoutStore } from "@state/workoutStore";
import type { Session } from "@shared/types";
import {
  AiWorkoutError,
  AiWorkoutDeps,
  requestAiWorkout,
  startAiWorkout,
} from "./aiWorkout";

function noop() {}
function freshStore(): StoreApi<WorkoutStore> {
  return createWorkoutStore(noop, noop, noop, noop, noop, noop, noop, noop);
}

function session(
  startedAt: number,
  exerciseId: string,
  setCount: number
): Session {
  return {
    id: `s-${startedAt}`,
    startedAt,
    endedAt: startedAt + 1000,
    sessionExercises: [
      {
        id: `se-${startedAt}`,
        exerciseId,
        order: 0,
        sets: Array.from({ length: setCount }, (_, i) => ({
          id: `set-${startedAt}-${i + 1}`,
          setNumber: i + 1,
          reps: 5,
          weight: 100,
        })),
      },
    ],
  };
}

const HISTORY: Session[] = [
  session(1_000, "deadlift", 3),
  session(2_000, "deadlift", 2),
  session(3_000, "barbell-row", 1),
];

// Deps with a happy-path mocked function client; tests override per case.
function fakeDeps(overrides?: Partial<AiWorkoutDeps>): AiWorkoutDeps & {
  invoke: jest.Mock;
  applyTemplate: jest.Mock;
} {
  return {
    isOnline: () => true,
    getSessions: () => HISTORY,
    invoke: jest.fn().mockResolvedValue({
      data: { exerciseIds: ["deadlift", "barbell-row", "lat-pulldown"] },
      error: null,
    }),
    applyTemplate: jest.fn(),
    ...overrides,
  } as AiWorkoutDeps & { invoke: jest.Mock; applyTemplate: jest.Mock };
}

async function kindOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return "resolved";
  } catch (error) {
    if (error instanceof AiWorkoutError) return error.kind;
    throw error;
  }
}

describe("requestAiWorkout", () => {
  it("sends the split and the history summary, returns the exercise ids", async () => {
    const deps = fakeDeps();

    const ids = await requestAiWorkout("pull", deps);

    expect(ids).toEqual(["deadlift", "barbell-row", "lat-pulldown"]);
    expect(deps.invoke).toHaveBeenCalledTimes(1);
    expect(deps.invoke).toHaveBeenCalledWith({
      split: "pull",
      summary: [
        { exerciseId: "deadlift", count: 2, lastPerformedAt: 2_000 },
        { exerciseId: "barbell-row", count: 1, lastPerformedAt: 3_000 },
      ],
    });
  });

  it("fails fast when offline without calling the function", async () => {
    const deps = fakeDeps({ isOnline: () => false });

    await expect(kindOf(requestAiWorkout("push", deps))).resolves.toBe(
      "offline"
    );
    expect(deps.invoke).not.toHaveBeenCalled();
  });

  it("maps a function error to a generation failure", async () => {
    const deps = fakeDeps({
      invoke: jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: "boom" } }),
    });

    await expect(kindOf(requestAiWorkout("push", deps))).resolves.toBe(
      "generation"
    );
  });

  it("maps a thrown network error to a generation failure", async () => {
    const deps = fakeDeps({
      invoke: jest.fn().mockRejectedValue(new Error("fetch failed")),
    });

    await expect(kindOf(requestAiWorkout("push", deps))).resolves.toBe(
      "generation"
    );
  });

  it.each([
    ["null data", null],
    ["missing exerciseIds", {}],
    ["non-array exerciseIds", { exerciseIds: "deadlift" }],
    ["non-string entries", { exerciseIds: [1, 2] }],
    ["empty list", { exerciseIds: [] }],
  ])("rejects a malformed response (%s)", async (_label, data) => {
    const deps = fakeDeps({
      invoke: jest.fn().mockResolvedValue({ data, error: null }),
    });

    await expect(kindOf(requestAiWorkout("push", deps))).resolves.toBe(
      "generation"
    );
  });

  it("times out when the function never responds", async () => {
    const deps = fakeDeps({
      invoke: jest.fn().mockReturnValue(new Promise(() => {})),
      timeoutMs: 10,
    });

    await expect(kindOf(requestAiWorkout("push", deps))).resolves.toBe(
      "timeout"
    );
  });
});

describe("startAiWorkout (generate-and-go)", () => {
  it("starts a session with the generated exercises, in order", async () => {
    const store = freshStore();
    const deps = fakeDeps({
      applyTemplate: jest.fn((ids: string[]) =>
        store.getState().applyTemplate(ids)
      ),
    });

    await startAiWorkout("pull", deps);

    const active = store.getState().activeSession;
    expect(active).not.toBeNull();
    expect(active?.sessionExercises.map((se) => se.exerciseId)).toEqual([
      "deadlift",
      "barbell-row",
      "lat-pulldown",
    ]);
  });

  it("creates no session when generation fails", async () => {
    const store = freshStore();
    const deps = fakeDeps({
      invoke: jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: "boom" } }),
      applyTemplate: jest.fn((ids: string[]) =>
        store.getState().applyTemplate(ids)
      ),
    });

    await expect(startAiWorkout("pull", deps)).rejects.toBeInstanceOf(
      AiWorkoutError
    );
    expect(deps.applyTemplate).not.toHaveBeenCalled();
    expect(store.getState().activeSession).toBeNull();
    expect(store.getState().history).toEqual([]);
  });

  it("creates no session when generation times out", async () => {
    const store = freshStore();
    const deps = fakeDeps({
      invoke: jest.fn().mockReturnValue(new Promise(() => {})),
      timeoutMs: 10,
      applyTemplate: jest.fn((ids: string[]) =>
        store.getState().applyTemplate(ids)
      ),
    });

    await expect(startAiWorkout("pull", deps)).rejects.toBeInstanceOf(
      AiWorkoutError
    );
    expect(store.getState().activeSession).toBeNull();
  });
});
