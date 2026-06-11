import { getAll, getById, SPLITS } from "./templateLibrary";
import * as exerciseLibrary from "@features/exercises/exerciseLibrary";

describe("templateLibrary", () => {
  it("exposes exactly the three builtin templates with stable namespaced ids", () => {
    const all = getAll();
    expect(all.map((t) => t.id)).toEqual([
      "builtin-push",
      "builtin-pull",
      "builtin-legs",
    ]);
    expect(all.map((t) => t.name)).toEqual(["Push", "Pull", "Legs"]);
  });

  it("every builtin template is a non-empty, duplicate-free ordered list", () => {
    for (const t of getAll()) {
      expect(t.exerciseIds.length).toBeGreaterThan(0);
      expect(new Set(t.exerciseIds).size).toBe(t.exerciseIds.length);
    }
  });

  it("every builtin exercise id resolves via the exercise library (FK integrity)", () => {
    for (const t of getAll()) {
      for (const exerciseId of t.exerciseIds) {
        expect(exerciseLibrary.getById(exerciseId)).toBeDefined();
      }
    }
  });

  it("getById returns the matching template, undefined for unknown ids", () => {
    const push = getById("builtin-push");
    expect(push?.name).toBe("Push");
    expect(push).toBe(getAll()[0]);
    expect(getById("builtin-nope")).toBeUndefined();
  });

  it("exports the fixed six-value Split set", () => {
    expect(SPLITS).toEqual([
      "Push",
      "Pull",
      "Legs",
      "Upper",
      "Lower",
      "Full body",
    ]);
  });
});
