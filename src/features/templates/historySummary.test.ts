import { Session } from "@shared/types";
import { historySummary } from "./historySummary";

let nextId = 0;
const id = () => `id-${nextId++}`;

function session(
  startedAt: number,
  exercises: { exerciseId: string; setCount: number }[]
): Session {
  return {
    id: id(),
    startedAt,
    endedAt: startedAt + 3_600_000,
    sessionExercises: exercises.map((e, i) => ({
      id: id(),
      exerciseId: e.exerciseId,
      order: i,
      sets: Array.from({ length: e.setCount }, (_, n) => ({
        id: id(),
        setNumber: n + 1,
        reps: 5,
        weight: 100,
      })),
    })),
  };
}

describe("historySummary", () => {
  it("is empty for empty history", () => {
    expect(historySummary([])).toEqual([]);
  });

  it("counts each session an exercise was performed in and tracks the most recent", () => {
    const sessions = [
      session(1_000, [{ exerciseId: "deadlift", setCount: 3 }]),
      session(2_000, [
        { exerciseId: "deadlift", setCount: 2 },
        { exerciseId: "pull-up", setCount: 1 },
      ]),
    ];
    expect(historySummary(sessions)).toEqual([
      { exerciseId: "deadlift", count: 2, lastPerformedAt: 2_000 },
      { exerciseId: "pull-up", count: 1, lastPerformedAt: 2_000 },
    ]);
  });

  it("excludes exercises with zero sets", () => {
    const sessions = [
      session(1_000, [
        { exerciseId: "deadlift", setCount: 1 },
        { exerciseId: "barbell-row", setCount: 0 },
      ]),
    ];
    expect(historySummary(sessions)).toEqual([
      { exerciseId: "deadlift", count: 1, lastPerformedAt: 1_000 },
    ]);
  });

  it("excludes a session-less exercise entirely (no zero-count entries)", () => {
    const sessions = [session(1_000, [{ exerciseId: "plank", setCount: 0 }])];
    expect(historySummary(sessions)).toEqual([]);
  });

  // Table-driven ordering: most-performed first, then most recent, then
  // exerciseId for full determinism.
  it.each([
    {
      name: "higher count wins regardless of input order",
      sessions: [
        session(1_000, [{ exerciseId: "push-up", setCount: 1 }]),
        session(2_000, [
          { exerciseId: "dip", setCount: 1 },
          { exerciseId: "push-up", setCount: 1 },
        ]),
      ],
      order: ["push-up", "dip"],
    },
    {
      name: "ties on count break by most recent",
      sessions: [
        session(1_000, [{ exerciseId: "dip", setCount: 1 }]),
        session(2_000, [{ exerciseId: "push-up", setCount: 1 }]),
      ],
      order: ["push-up", "dip"],
    },
    {
      name: "ties on count and recency break by exerciseId",
      sessions: [
        session(1_000, [
          { exerciseId: "push-up", setCount: 1 },
          { exerciseId: "dip", setCount: 1 },
        ]),
      ],
      order: ["dip", "push-up"],
    },
  ])("$name", ({ sessions, order }) => {
    expect(historySummary(sessions).map((e) => e.exerciseId)).toEqual(order);
  });

  it("uses the latest session's startedAt even when sessions arrive out of order", () => {
    const sessions = [
      session(5_000, [{ exerciseId: "deadlift", setCount: 1 }]),
      session(1_000, [{ exerciseId: "deadlift", setCount: 1 }]),
    ];
    expect(historySummary(sessions)).toEqual([
      { exerciseId: "deadlift", count: 2, lastPerformedAt: 5_000 },
    ]);
  });
});
