import { summarizeSession } from "./sessionSummary";
import { Session } from "@shared/types";

function session(
  exercises: Array<{
    exerciseId: string;
    order: number;
    sets: Array<{ setNumber: number; reps: number; weight: number }>;
  }>,
  startedAt = 1000,
  endedAt: number | null = 1000 + 60_000
): Session {
  return {
    id: "s-1",
    startedAt,
    endedAt,
    sessionExercises: exercises.map((e, i) => ({
      id: `se-${i}`,
      exerciseId: e.exerciseId,
      order: e.order,
      sets: e.sets.map((s) => ({ id: `set-${i}-${s.setNumber}`, ...s })),
    })),
  };
}

describe("summarizeSession", () => {
  it("summarises an empty session as zero sets and no exercises", () => {
    expect(summarizeSession(session([]))).toEqual({
      durationMs: 60_000,
      totalSets: 0,
      exercises: [],
    });
  });

  it("computes duration from startedAt to endedAt", () => {
    const s = session([], 5000, 5000 + 45 * 60_000);
    expect(summarizeSession(s).durationMs).toBe(45 * 60_000);
  });

  it("treats a missing endedAt as zero duration rather than crashing", () => {
    const s = session([], 5000, null);
    expect(summarizeSession(s).durationMs).toBe(0);
  });

  it("drops exercises with no logged sets", () => {
    const s = session([
      { exerciseId: "barbell-bench-press", order: 0, sets: [] },
      {
        exerciseId: "barbell-back-squat",
        order: 1,
        sets: [{ setNumber: 1, reps: 5, weight: 100 }],
      },
    ]);
    const summary = summarizeSession(s);
    expect(summary.exercises.map((e) => e.exerciseId)).toEqual([
      "barbell-back-squat",
    ]);
    expect(summary.totalSets).toBe(1);
  });

  it("counts sets per exercise and in total", () => {
    const s = session([
      {
        exerciseId: "barbell-bench-press",
        order: 0,
        sets: [
          { setNumber: 1, reps: 8, weight: 80 },
          { setNumber: 2, reps: 6, weight: 85 },
        ],
      },
      {
        exerciseId: "barbell-back-squat",
        order: 1,
        sets: [
          { setNumber: 1, reps: 5, weight: 100 },
          { setNumber: 2, reps: 5, weight: 100 },
          { setNumber: 3, reps: 3, weight: 110 },
        ],
      },
    ]);
    const summary = summarizeSession(s);
    expect(summary.totalSets).toBe(5);
    expect(summary.exercises.map((e) => e.setCount)).toEqual([2, 3]);
  });

  it("picks the top set per exercise (highest weight; ties by reps desc, then setNumber desc)", () => {
    const s = session([
      {
        exerciseId: "barbell-bench-press",
        order: 0,
        sets: [
          { setNumber: 1, reps: 8, weight: 80 },
          { setNumber: 2, reps: 6, weight: 85 },
          { setNumber: 3, reps: 4, weight: 82.5 },
        ],
      },
      {
        // All-tied weights: reps desc breaks the tie.
        exerciseId: "barbell-back-squat",
        order: 1,
        sets: [
          { setNumber: 1, reps: 5, weight: 100 },
          { setNumber: 2, reps: 8, weight: 100 },
        ],
      },
    ]);
    const [bench, squat] = summarizeSession(s).exercises;
    expect(bench.topSet).toMatchObject({ setNumber: 2, reps: 6, weight: 85 });
    expect(squat.topSet).toMatchObject({ setNumber: 2, reps: 8, weight: 100 });
  });

  it("orders exercises by their session order, not array position", () => {
    const s = session([
      {
        exerciseId: "barbell-back-squat",
        order: 1,
        sets: [{ setNumber: 1, reps: 5, weight: 100 }],
      },
      {
        exerciseId: "barbell-bench-press",
        order: 0,
        sets: [{ setNumber: 1, reps: 8, weight: 80 }],
      },
    ]);
    expect(summarizeSession(s).exercises.map((e) => e.exerciseId)).toEqual([
      "barbell-bench-press",
      "barbell-back-squat",
    ]);
  });

  it("merges duplicate session exercises of the same exercise into one breakdown row", () => {
    const s = session([
      {
        exerciseId: "barbell-bench-press",
        order: 0,
        sets: [{ setNumber: 1, reps: 8, weight: 80 }],
      },
      {
        exerciseId: "barbell-back-squat",
        order: 1,
        sets: [{ setNumber: 1, reps: 5, weight: 100 }],
      },
      {
        // A second bench entry later in the session: folds into the first row.
        exerciseId: "barbell-bench-press",
        order: 2,
        sets: [
          { setNumber: 1, reps: 6, weight: 90 },
          { setNumber: 2, reps: 4, weight: 95 },
        ],
      },
    ]);
    const summary = summarizeSession(s);
    expect(summary.exercises.map((e) => e.exerciseId)).toEqual([
      "barbell-bench-press",
      "barbell-back-squat",
    ]);
    const bench = summary.exercises[0];
    expect(bench.setCount).toBe(3);
    expect(bench.topSet).toMatchObject({ reps: 4, weight: 95 });
    expect(summary.totalSets).toBe(4);
  });
});
