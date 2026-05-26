import { createWorkoutStore, WorkoutStore } from "./workoutStore";
import { StoreApi } from "zustand/vanilla";
import { PersistedState, SCHEMA_VERSION, Session } from "../types";

function freshStore(): StoreApi<WorkoutStore> {
  // No-op persist: exercise the store in pure form, no AsyncStorage.
  return createWorkoutStore(() => {});
}

function session(
  startedAt: number,
  exerciseId: string,
  sets: Array<{ setNumber: number; reps: number; weight: number }>
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
        sets: sets.map((s) => ({ id: `set-${startedAt}-${s.setNumber}`, ...s })),
      },
    ],
  };
}

function hydrated(history: Session[]): StoreApi<WorkoutStore> {
  const store = freshStore();
  const state: PersistedState = {
    schemaVersion: SCHEMA_VERSION,
    activeSession: null,
    history,
  };
  store.getState().hydrate(state);
  return store;
}

describe("workoutStore", () => {
  describe("session lifecycle", () => {
    it("starts with no active session and empty history", () => {
      const store = freshStore();
      expect(store.getState().activeSession).toBeNull();
      expect(store.getState().history).toEqual([]);
    });

    it("startSession creates an active session with no exercises", () => {
      const store = freshStore();
      store.getState().startSession();
      const active = store.getState().activeSession;
      expect(active).not.toBeNull();
      expect(active?.endedAt).toBeNull();
      expect(active?.sessionExercises).toEqual([]);
      expect(typeof active?.startedAt).toBe("number");
    });

    it("throws when starting a session while one is already active", () => {
      const store = freshStore();
      store.getState().startSession();
      expect(() => store.getState().startSession()).toThrow();
    });

    it("endSession moves the active session to history with endedAt set", () => {
      const store = freshStore();
      store.getState().startSession();
      const startedId = store.getState().activeSession?.id;
      store.getState().endSession();
      expect(store.getState().activeSession).toBeNull();
      expect(store.getState().history).toHaveLength(1);
      const ended = store.getState().history[0];
      expect(ended.id).toBe(startedId);
      expect(typeof ended.endedAt).toBe("number");
    });

    it("throws when ending with no active session", () => {
      const store = freshStore();
      expect(() => store.getState().endSession()).toThrow();
    });
  });

  describe("addExerciseToSession", () => {
    it("appends exercises with sequential order", () => {
      const store = freshStore();
      store.getState().startSession();
      store.getState().addExerciseToSession("bench-press");
      store.getState().addExerciseToSession("squat");
      const exercises = store.getState().activeSession?.sessionExercises ?? [];
      expect(exercises).toHaveLength(2);
      expect(exercises[0].exerciseId).toBe("bench-press");
      expect(exercises[0].order).toBe(0);
      expect(exercises[1].exerciseId).toBe("squat");
      expect(exercises[1].order).toBe(1);
      expect(exercises[0].sets).toEqual([]);
    });
  });

  describe("removeExerciseFromSession", () => {
    it("removes the targeted exercise and all of its sets", () => {
      const store = freshStore();
      store.getState().startSession();
      store.getState().addExerciseToSession("bench-press");
      const seId = store.getState().activeSession!.sessionExercises[0].id;
      store.getState().logSet(seId, 8, 80);
      store.getState().logSet(seId, 8, 80);

      store.getState().removeExerciseFromSession(seId);

      expect(store.getState().activeSession!.sessionExercises).toEqual([]);
    });

    it("leaves sibling exercises and their sets intact", () => {
      const store = freshStore();
      store.getState().startSession();
      store.getState().addExerciseToSession("bench-press");
      store.getState().addExerciseToSession("squat");
      const [se1, se2] = store.getState().activeSession!.sessionExercises;
      store.getState().logSet(se2.id, 5, 100);

      store.getState().removeExerciseFromSession(se1.id);

      const remaining = store.getState().activeSession!.sessionExercises;
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(se2.id);
      expect(remaining[0].exerciseId).toBe("squat");
      expect(remaining[0].sets).toHaveLength(1);
    });
  });

  describe("logSet", () => {
    it("assigns sequential setNumber per session exercise", () => {
      const store = freshStore();
      store.getState().startSession();
      store.getState().addExerciseToSession("bench-press");
      const seId = store.getState().activeSession!.sessionExercises[0].id;

      store.getState().logSet(seId, 8, 80);
      store.getState().logSet(seId, 8, 82.5);
      store.getState().logSet(seId, 6, 85);

      const sets = store.getState().activeSession!.sessionExercises[0].sets;
      expect(sets.map((s) => s.setNumber)).toEqual([1, 2, 3]);
      expect(sets.map((s) => s.reps)).toEqual([8, 8, 6]);
      expect(sets.map((s) => s.weight)).toEqual([80, 82.5, 85]);
    });

    it("numbers sets independently for each session exercise", () => {
      const store = freshStore();
      store.getState().startSession();
      store.getState().addExerciseToSession("bench-press");
      store.getState().addExerciseToSession("squat");
      const [se1, se2] = store.getState().activeSession!.sessionExercises;

      store.getState().logSet(se1.id, 8, 80);
      store.getState().logSet(se2.id, 5, 100);
      store.getState().logSet(se2.id, 5, 100);

      const exercises = store.getState().activeSession!.sessionExercises;
      expect(exercises[0].sets.map((s) => s.setNumber)).toEqual([1]);
      expect(exercises[1].sets.map((s) => s.setNumber)).toEqual([1, 2]);
    });
  });

  describe("getLastSetFor", () => {
    it("returns null when the exercise has never been performed", () => {
      const store = freshStore();
      expect(store.getState().getLastSetFor("bench-press")).toBeNull();
    });

    it("returns null when the exercise is in the session but has no sets", () => {
      const store = freshStore();
      store.getState().startSession();
      store.getState().addExerciseToSession("bench-press");
      expect(store.getState().getLastSetFor("bench-press")).toBeNull();
    });

    it("returns the logged set after a single set in the active session", () => {
      const store = freshStore();
      store.getState().startSession();
      store.getState().addExerciseToSession("bench-press");
      const seId = store.getState().activeSession!.sessionExercises[0].id;
      store.getState().logSet(seId, 8, 80);

      expect(store.getState().getLastSetFor("bench-press")).toEqual({
        reps: 8,
        weight: 80,
      });
    });

    it("returns the most recent set within a session (highest setNumber)", () => {
      const store = freshStore();
      store.getState().startSession();
      store.getState().addExerciseToSession("bench-press");
      const seId = store.getState().activeSession!.sessionExercises[0].id;
      store.getState().logSet(seId, 8, 80);
      store.getState().logSet(seId, 6, 85);

      expect(store.getState().getLastSetFor("bench-press")).toEqual({
        reps: 6,
        weight: 85,
      });
    });

    it("ignores sets for other exercises", () => {
      const store = freshStore();
      store.getState().startSession();
      store.getState().addExerciseToSession("squat");
      const seId = store.getState().activeSession!.sessionExercises[0].id;
      store.getState().logSet(seId, 5, 100);

      expect(store.getState().getLastSetFor("bench-press")).toBeNull();
    });

    it("across multiple historical sessions, the most recent (by startedAt) wins", () => {
      const store = hydrated([
        session(3000, "bench-press", [
          { setNumber: 1, reps: 5, weight: 100 },
          { setNumber: 2, reps: 5, weight: 102.5 },
        ]),
        session(1000, "bench-press", [{ setNumber: 1, reps: 10, weight: 60 }]),
      ]);

      // 3000 is the most recent session; its highest setNumber is 2 → 5 × 102.5.
      expect(store.getState().getLastSetFor("bench-press")).toEqual({
        reps: 5,
        weight: 102.5,
      });
    });

    it("is not fooled by history array order — sorts by startedAt", () => {
      const store = hydrated([
        session(5000, "bench-press", [{ setNumber: 1, reps: 3, weight: 120 }]),
        session(2000, "bench-press", [{ setNumber: 1, reps: 8, weight: 80 }]),
      ]);

      expect(store.getState().getLastSetFor("bench-press")).toEqual({
        reps: 3,
        weight: 120,
      });
    });

    it("prefers the active session's set over history", () => {
      const store = hydrated([
        session(1000, "bench-press", [{ setNumber: 1, reps: 5, weight: 100 }]),
      ]);
      store.getState().startSession();
      const seId = (() => {
        store.getState().addExerciseToSession("bench-press");
        return store.getState().activeSession!.sessionExercises[0].id;
      })();
      store.getState().logSet(seId, 8, 80);

      expect(store.getState().getLastSetFor("bench-press")).toEqual({
        reps: 8,
        weight: 80,
      });
    });

    it("after ending and starting a new session, returns the previous session's most recent set", () => {
      const store = freshStore();
      store.getState().startSession();
      store.getState().addExerciseToSession("bench-press");
      const seId = store.getState().activeSession!.sessionExercises[0].id;
      store.getState().logSet(seId, 8, 80);
      store.getState().logSet(seId, 6, 85);
      store.getState().endSession();

      // New session, same exercise added but no sets yet.
      store.getState().startSession();
      store.getState().addExerciseToSession("bench-press");

      expect(store.getState().getLastSetFor("bench-press")).toEqual({
        reps: 6,
        weight: 85,
      });
    });
  });

  describe("getSessionsList", () => {
    it("returns an empty list when there is no history", () => {
      const store = freshStore();
      expect(store.getState().getSessionsList()).toEqual([]);
    });

    it("returns ended sessions newest-first with exercise count and duration", () => {
      const older: Session = {
        id: "old",
        startedAt: 1000,
        endedAt: 1000 + 60_000,
        sessionExercises: [
          { id: "se-a", exerciseId: "bench-press", order: 0, sets: [] },
        ],
      };
      const newer: Session = {
        id: "new",
        startedAt: 5000,
        endedAt: 5000 + 120_000,
        sessionExercises: [
          { id: "se-b", exerciseId: "squat", order: 0, sets: [] },
          { id: "se-c", exerciseId: "deadlift", order: 1, sets: [] },
        ],
      };
      // Hydrate newest-last (the append-efficiency convention) to prove the
      // selector sorts by startedAt rather than trusting array order.
      const store = hydrated([older, newer]);

      const list = store.getState().getSessionsList();
      expect(list.map((s) => s.id)).toEqual(["new", "old"]);
      expect(list[0]).toEqual({
        id: "new",
        startedAt: 5000,
        endedAt: 125_000,
        exerciseCount: 2,
        durationMs: 120_000,
      });
      expect(list[1]).toEqual({
        id: "old",
        startedAt: 1000,
        endedAt: 61_000,
        exerciseCount: 1,
        durationMs: 60_000,
      });
    });

    it("excludes the active (in-progress) session", () => {
      const store = hydrated([
        session(1000, "bench-press", [{ setNumber: 1, reps: 5, weight: 100 }]),
      ]);
      store.getState().startSession();

      const list = store.getState().getSessionsList();
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe("s-1000");
    });
  });

  describe("persistence seam", () => {
    it("persists a snapshot on every mutation", () => {
      const saved: unknown[] = [];
      const store = createWorkoutStore((state) => saved.push(state));
      store.getState().startSession();
      store.getState().addExerciseToSession("bench-press");
      expect(saved).toHaveLength(2);
      expect(saved[saved.length - 1]).toMatchObject({ schemaVersion: 1 });
    });
  });
});
