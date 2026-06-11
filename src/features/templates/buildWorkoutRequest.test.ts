import { getAll } from "../exercises/exerciseLibrary";
import {
  buildWorkoutRequest,
  isSplit,
  SPLITS,
  HistorySummaryEntry,
} from "./buildWorkoutRequest";

const summary: HistorySummaryEntry[] = [
  { exerciseId: "deadlift", count: 4, lastPerformedAt: 1_700_000_000_000 },
  { exerciseId: "pull-up", count: 2, lastPerformedAt: 1_699_000_000_000 },
];

describe("SPLITS / isSplit", () => {
  it("is the agreed six splits", () => {
    expect(SPLITS).toEqual(["push", "pull", "legs", "upper", "lower", "full-body"]);
  });

  it("accepts every split and rejects anything else", () => {
    for (const s of SPLITS) expect(isSplit(s)).toBe(true);
    expect(isSplit("cardio")).toBe(false);
    expect(isSplit("")).toBe(false);
    expect(isSplit(undefined)).toBe(false);
    expect(isSplit(42)).toBe(false);
  });
});

describe("buildWorkoutRequest", () => {
  it("targets claude-haiku-4-5", () => {
    const request = buildWorkoutRequest({ split: "push", summary });
    expect(request.model).toBe("claude-haiku-4-5");
  });

  it("constrains exerciseIds to exactly the full set of exercise-library ids", () => {
    const request = buildWorkoutRequest({ split: "push", summary });
    const schema = request.output_config.format.schema;
    expect(schema).toMatchObject({
      type: "object",
      additionalProperties: false,
      required: ["exerciseIds"],
    });
    expect(schema.properties.exerciseIds.items.enum).toEqual(
      getAll().map((e) => e.id)
    );
  });

  it("includes the split and every summary entry in the prompt", () => {
    const request = buildWorkoutRequest({ split: "pull", summary });
    const user = request.messages[0].content;
    expect(request.messages[0].role).toBe("user");
    expect(user).toContain("pull");
    for (const entry of summary) {
      expect(user).toContain(entry.exerciseId);
      expect(user).toContain(String(entry.count));
      expect(user).toContain(String(entry.lastPerformedAt));
    }
  });

  it("lists the exercise library in the system prompt so ids are meaningful", () => {
    const request = buildWorkoutRequest({ split: "legs", summary: [] });
    for (const exercise of getAll()) {
      expect(request.system).toContain(exercise.id);
      expect(request.system).toContain(exercise.name);
    }
  });

  // Drift guard: the enum is derived from exerciseLibrary.getAll() at call
  // time, so adding a library exercise widens AI selection automatically.
  it("widens the enum when the exercise library gains an exercise", () => {
    jest.isolateModules(() => {
      const realLibrary = jest.requireActual("../exercises/exerciseLibrary");
      jest.doMock("../exercises/exerciseLibrary", () => ({
        ...realLibrary,
        getAll: () => [
          ...realLibrary.getAll(),
          { id: "zercher-squat", name: "Zercher Squat", muscleGroup: "legs" },
        ],
      }));
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fresh = require("./buildWorkoutRequest") as typeof import("./buildWorkoutRequest");
      const request = fresh.buildWorkoutRequest({ split: "legs", summary: [] });
      const ids = request.output_config.format.schema.properties.exerciseIds.items.enum;
      expect(ids).toContain("zercher-squat");
      expect(ids).toHaveLength(getAll().length + 1);
    });
  });
});
