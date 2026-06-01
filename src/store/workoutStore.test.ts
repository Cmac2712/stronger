import { createWorkoutStore, WorkoutStore, pickTopSet } from "./workoutStore";
import { StoreApi } from "zustand/vanilla";
import { PersistedState, SCHEMA_VERSION, Session, Set } from "../types";

function freshStore(): StoreApi<WorkoutStore> {
  return createWorkoutStore(() => {}, () => {}, () => {});
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
    restDurationMs: 120_000,
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

  describe("updateSet", () => {
    it("partially updates a set in the active session (reps only) and leaves siblings untouched", () => {
      const store = freshStore();
      store.getState().startSession();
      store.getState().addExerciseToSession("bench-press");
      const seId = store.getState().activeSession!.sessionExercises[0].id;
      store.getState().logSet(seId, 8, 80);
      store.getState().logSet(seId, 8, 80);
      const [s1, s2] = store.getState().activeSession!.sessionExercises[0].sets;

      store.getState().updateSet(s1.id, { reps: 10 });

      const sets = store.getState().activeSession!.sessionExercises[0].sets;
      expect(sets[0]).toEqual({ id: s1.id, setNumber: 1, reps: 10, weight: 80 });
      expect(sets[1]).toEqual(s2);
    });

    it("updates reps and weight together in the active session", () => {
      const store = freshStore();
      store.getState().startSession();
      store.getState().addExerciseToSession("bench-press");
      const seId = store.getState().activeSession!.sessionExercises[0].id;
      store.getState().logSet(seId, 8, 80);
      const setId = store.getState().activeSession!.sessionExercises[0].sets[0].id;

      store.getState().updateSet(setId, { reps: 6, weight: 85 });

      expect(store.getState().activeSession!.sessionExercises[0].sets[0]).toEqual({
        id: setId,
        setNumber: 1,
        reps: 6,
        weight: 85,
      });
    });

    it("updates a set in a historical session without touching siblings or other sessions", () => {
      const store = hydrated([
        session(1000, "bench-press", [
          { setNumber: 1, reps: 5, weight: 100 },
          { setNumber: 2, reps: 5, weight: 100 },
        ]),
        session(2000, "squat", [{ setNumber: 1, reps: 8, weight: 60 }]),
      ]);

      store.getState().updateSet("set-1000-1", { weight: 105 });

      const bench = store.getState().history.find((s) => s.id === "s-1000")!;
      expect(bench.sessionExercises[0].sets[0]).toEqual({
        id: "set-1000-1",
        setNumber: 1,
        reps: 5,
        weight: 105,
      });
      expect(bench.sessionExercises[0].sets[1]).toEqual({
        id: "set-1000-2",
        setNumber: 2,
        reps: 5,
        weight: 100,
      });
      const squat = store.getState().history.find((s) => s.id === "s-2000")!;
      expect(squat.sessionExercises[0].sets[0]).toEqual({
        id: "set-2000-1",
        setNumber: 1,
        reps: 8,
        weight: 60,
      });
    });

    it("persists on update", () => {
      const saved: PersistedState[] = [];
      const store = createWorkoutStore((s) => saved.push(s), () => {}, () => {});
      store.getState().startSession();
      store.getState().addExerciseToSession("bench-press");
      const seId = store.getState().activeSession!.sessionExercises[0].id;
      store.getState().logSet(seId, 8, 80);
      const setId = store.getState().activeSession!.sessionExercises[0].sets[0].id;
      const before = saved.length;

      store.getState().updateSet(setId, { reps: 9 });

      expect(saved.length).toBe(before + 1);
      expect(saved[saved.length - 1].activeSession!.sessionExercises[0].sets[0].reps).toBe(9);
    });
  });

  describe("deleteSet", () => {
    it("removes a set from the active session; siblings keep their setNumber (no renumbering)", () => {
      const store = freshStore();
      store.getState().startSession();
      store.getState().addExerciseToSession("bench-press");
      const seId = store.getState().activeSession!.sessionExercises[0].id;
      store.getState().logSet(seId, 8, 80);
      store.getState().logSet(seId, 8, 82.5);
      store.getState().logSet(seId, 6, 85);
      const sets0 = store.getState().activeSession!.sessionExercises[0].sets;
      const middle = sets0[1];

      store.getState().deleteSet(middle.id);

      const sets = store.getState().activeSession!.sessionExercises[0].sets;
      expect(sets).toHaveLength(2);
      expect(sets.map((s) => s.setNumber)).toEqual([1, 3]);
      expect(sets.map((s) => s.id)).toEqual([sets0[0].id, sets0[2].id]);
    });

    it("removes a set from a historical session and leaves other sessions intact", () => {
      const store = hydrated([
        session(1000, "bench-press", [
          { setNumber: 1, reps: 5, weight: 100 },
          { setNumber: 2, reps: 5, weight: 100 },
        ]),
        session(2000, "squat", [{ setNumber: 1, reps: 8, weight: 60 }]),
      ]);

      store.getState().deleteSet("set-1000-1");

      const bench = store.getState().history.find((s) => s.id === "s-1000")!;
      expect(bench.sessionExercises[0].sets.map((s) => s.setNumber)).toEqual([2]);
      expect(bench.sessionExercises[0].sets[0].id).toBe("set-1000-2");
      const squat = store.getState().history.find((s) => s.id === "s-2000")!;
      expect(squat.sessionExercises[0].sets).toHaveLength(1);
    });

    it("deleting a historical set does not affect the active session", () => {
      const store = hydrated([
        session(1000, "bench-press", [{ setNumber: 1, reps: 5, weight: 100 }]),
      ]);
      store.getState().startSession();
      store.getState().addExerciseToSession("squat");
      const seId = store.getState().activeSession!.sessionExercises[0].id;
      store.getState().logSet(seId, 5, 60);

      store.getState().deleteSet("set-1000-1");

      expect(
        store.getState().activeSession!.sessionExercises[0].sets
      ).toHaveLength(1);
      const bench = store.getState().history.find((s) => s.id === "s-1000")!;
      expect(bench.sessionExercises[0].sets).toHaveLength(0);
    });

    it("persists on delete", () => {
      const saved: PersistedState[] = [];
      const store = createWorkoutStore((s) => saved.push(s), () => {}, () => {});
      store.getState().startSession();
      store.getState().addExerciseToSession("bench-press");
      const seId = store.getState().activeSession!.sessionExercises[0].id;
      store.getState().logSet(seId, 8, 80);
      const setId = store.getState().activeSession!.sessionExercises[0].sets[0].id;
      const before = saved.length;

      store.getState().deleteSet(setId);

      expect(saved.length).toBe(before + 1);
      expect(
        saved[saved.length - 1].activeSession!.sessionExercises[0].sets
      ).toHaveLength(0);
    });
  });

  describe("pickTopSet", () => {
    const s = (
      setNumber: number,
      reps: number,
      weight: number
    ): Set => ({ id: `x${setNumber}`, setNumber, reps, weight });

    it("returns undefined for an empty set list", () => {
      expect(pickTopSet([])).toBeUndefined();
    });

    it("picks the highest-weight set regardless of order", () => {
      const top = s(2, 6, 100);
      expect(pickTopSet([s(1, 8, 80), top, s(3, 10, 90)])).toBe(top);
    });

    it("breaks weight ties by reps descending", () => {
      const top = s(1, 8, 100);
      expect(pickTopSet([top, s(2, 5, 100)])).toBe(top);
    });

    it("breaks weight+reps ties by setNumber descending", () => {
      const top = s(3, 8, 100);
      expect(pickTopSet([s(1, 8, 100), top, s(2, 8, 100)])).toBe(top);
    });
  });

  describe("getHistoryFor", () => {
    it("returns empty sessions and topSetWeights when the exercise was never performed", () => {
      const store = freshStore();
      expect(store.getState().getHistoryFor("bench-press")).toEqual({
        sessions: [],
        topSetWeights: [],
      });
    });

    it("excludes sessions where the exercise was added but has no sets", () => {
      const store = freshStore();
      store.getState().startSession();
      store.getState().addExerciseToSession("bench-press");
      expect(store.getState().getHistoryFor("bench-press")).toEqual({
        sessions: [],
        topSetWeights: [],
      });
    });

    it("returns a single session's sets and its top-set weight", () => {
      const store = hydrated([
        session(1000, "bench-press", [
          { setNumber: 1, reps: 8, weight: 80 },
          { setNumber: 2, reps: 6, weight: 85 },
          { setNumber: 3, reps: 4, weight: 82.5 },
        ]),
      ]);
      const h = store.getState().getHistoryFor("bench-press");
      expect(h.sessions).toEqual([
        {
          id: "s-1000",
          startedAt: 1000,
          sets: [
            { setNumber: 1, reps: 8, weight: 80 },
            { setNumber: 2, reps: 6, weight: 85 },
            { setNumber: 3, reps: 4, weight: 82.5 },
          ],
        },
      ]);
      expect(h.topSetWeights).toEqual([85]);
    });

    it("scopes to the requested exercise, ignoring others in the same session", () => {
      const multi: Session = {
        id: "s-multi",
        startedAt: 2000,
        endedAt: 3000,
        sessionExercises: [
          {
            id: "se-a",
            exerciseId: "bench-press",
            order: 0,
            sets: [{ id: "a1", setNumber: 1, reps: 8, weight: 80 }],
          },
          {
            id: "se-b",
            exerciseId: "squat",
            order: 1,
            sets: [{ id: "b1", setNumber: 1, reps: 5, weight: 120 }],
          },
        ],
      };
      const store = hydrated([multi]);
      const h = store.getState().getHistoryFor("bench-press");
      expect(h.sessions).toHaveLength(1);
      expect(h.sessions[0].sets).toEqual([{ setNumber: 1, reps: 8, weight: 80 }]);
      expect(h.topSetWeights).toEqual([80]);
    });

    it("orders topSetWeights chronologically (oldest first) and sessions newest-first", () => {
      // Hydrate out of order to prove ordering is by startedAt, not array order.
      const store = hydrated([
        session(3000, "bench-press", [{ setNumber: 1, reps: 5, weight: 100 }]),
        session(1000, "bench-press", [{ setNumber: 1, reps: 8, weight: 80 }]),
        session(2000, "bench-press", [{ setNumber: 1, reps: 6, weight: 90 }]),
      ]);
      const h = store.getState().getHistoryFor("bench-press");
      expect(h.topSetWeights).toEqual([80, 90, 100]);
      expect(h.sessions.map((x) => x.id)).toEqual(["s-3000", "s-2000", "s-1000"]);
    });

    it("limits topSetWeights to the last 10 sessions but returns all sessions", () => {
      const sessions: Session[] = [];
      for (let i = 1; i <= 12; i++) {
        sessions.push(
          session(i * 1000, "bench-press", [{ setNumber: 1, reps: 5, weight: i }])
        );
      }
      const store = hydrated(sessions);
      const h = store.getState().getHistoryFor("bench-press");
      expect(h.sessions).toHaveLength(12);
      // Last 10 sessions (weights 3..12) in chronological order.
      expect(h.topSetWeights).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });

    it("includes the active in-progress session", () => {
      const store = hydrated([
        session(1000, "bench-press", [{ setNumber: 1, reps: 5, weight: 80 }]),
      ]);
      store.getState().startSession();
      store.getState().addExerciseToSession("bench-press");
      const seId = store.getState().activeSession!.sessionExercises[0].id;
      store.getState().logSet(seId, 3, 100);

      const h = store.getState().getHistoryFor("bench-press");
      // chronological: history (1000) then the active session (now)
      expect(h.topSetWeights).toEqual([80, 100]);
      expect(h.sessions).toHaveLength(2);
      // sessions are newest-first, so the active session leads
      expect(h.sessions[0].sets).toEqual([{ setNumber: 1, reps: 3, weight: 100 }]);
    });
  });

  describe("persistence seam", () => {
    it("persists a snapshot on every mutation", () => {
      const saved: unknown[] = [];
      const store = createWorkoutStore((state) => saved.push(state), () => {}, () => {});
      store.getState().startSession();
      store.getState().addExerciseToSession("bench-press");
      expect(saved).toHaveLength(2);
      expect(saved[saved.length - 1]).toMatchObject({ schemaVersion: 1 });
    });

    it("includes restDurationMs in the persisted snapshot", () => {
      const saved: PersistedState[] = [];
      const store = createWorkoutStore((state) => saved.push(state), () => {}, () => {});
      store.getState().setRestDuration(90_000);
      expect(saved[saved.length - 1].restDurationMs).toBe(90_000);
    });

    it("setRestDuration calls the onRestDurationChange callback", () => {
      const synced: number[] = [];
      const store = createWorkoutStore(() => {}, (ms) => synced.push(ms), () => {});
      store.getState().setRestDuration(90_000);
      store.getState().setRestDuration(60_000);
      expect(synced).toEqual([90_000, 60_000]);
    });
  });

  describe("session sync callback", () => {
    it("startSession calls onSessionChange with the new session", () => {
      const synced: Array<{ id: string; startedAt: number; endedAt: number | null }> = [];
      const store = createWorkoutStore(() => {}, () => {}, (s) => synced.push(s));
      store.getState().startSession();

      expect(synced).toHaveLength(1);
      const active = store.getState().activeSession!;
      expect(synced[0]).toEqual({
        id: active.id,
        startedAt: active.startedAt,
        endedAt: null,
      });
    });

    it("endSession calls onSessionChange with ended_at set", () => {
      const synced: Array<{ id: string; startedAt: number; endedAt: number | null }> = [];
      const store = createWorkoutStore(() => {}, () => {}, (s) => synced.push(s));
      store.getState().startSession();
      synced.length = 0;

      store.getState().endSession();

      expect(synced).toHaveLength(1);
      expect(synced[0].endedAt).not.toBeNull();
      expect(typeof synced[0].endedAt).toBe("number");
      const ended = store.getState().history[store.getState().history.length - 1];
      expect(synced[0]).toEqual({
        id: ended.id,
        startedAt: ended.startedAt,
        endedAt: ended.endedAt,
      });
    });
  });

  describe("rest timer", () => {
    function activeStore(): StoreApi<WorkoutStore> {
      const store = freshStore();
      store.getState().startSession();
      store.getState().addExerciseToSession("bench-press");
      return store;
    }

    it("starts idle at the configured default duration", () => {
      const store = freshStore();
      expect(store.getState().restTimer).toEqual({
        status: "idle",
        durationMs: 120_000,
      });
    });

    it("auto-starts a running countdown when a set is logged", () => {
      const store = activeStore();
      const seId = store.getState().activeSession!.sessionExercises[0].id;
      store.getState().logSet(seId, 5, 100);
      const t = store.getState().restTimer;
      expect(t.status).toBe("running");
      expect(t.durationMs).toBe(120_000);
    });

    it("pauses, resumes, and resets under user control", () => {
      const store = activeStore();
      store.getState().startRestTimer(1_000);
      store.getState().pauseRestTimer(31_000);
      expect(store.getState().restTimer).toEqual({
        status: "paused",
        remainingMs: 90_000,
        durationMs: 120_000,
      });

      store.getState().resumeRestTimer(50_000);
      expect(store.getState().restTimer).toEqual({
        status: "running",
        endsAt: 140_000,
        durationMs: 120_000,
      });

      store.getState().resetRestTimer(200_000);
      expect(store.getState().restTimer).toEqual({
        status: "running",
        endsAt: 320_000,
        durationMs: 120_000,
      });
    });

    it("setRestDuration persists the default and updates an idle timer", () => {
      const store = freshStore();
      store.getState().setRestDuration(90_000);
      expect(store.getState().restDurationMs).toBe(90_000);
      expect(store.getState().restTimer).toEqual({
        status: "idle",
        durationMs: 90_000,
      });
    });

    it("setRestDuration does not disturb a running countdown", () => {
      const store = activeStore();
      store.getState().startRestTimer(1_000);
      store.getState().setRestDuration(90_000);
      expect(store.getState().restTimer).toEqual({
        status: "running",
        endsAt: 121_000,
        durationMs: 120_000,
      });
      // the new default still takes effect on the next auto-start
      const seId = store.getState().activeSession!.sessionExercises[0].id;
      store.getState().logSet(seId, 5, 100);
      expect(store.getState().restTimer.durationMs).toBe(90_000);
    });

    it("hydrate adopts the persisted rest duration into the idle timer", () => {
      const store = freshStore();
      store.getState().hydrate({
        schemaVersion: SCHEMA_VERSION,
        activeSession: null,
        history: [],
        restDurationMs: 75_000,
      });
      expect(store.getState().restDurationMs).toBe(75_000);
      expect(store.getState().restTimer).toEqual({
        status: "idle",
        durationMs: 75_000,
      });
    });
  });
});
