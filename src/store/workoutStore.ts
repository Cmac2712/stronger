import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";
import {
  DEFAULT_REST_DURATION_MS,
  PersistedState,
  SCHEMA_VERSION,
  Session,
  SessionExercise,
  Set,
} from "../types";
import { genId } from "../util/id";
import { saveState } from "../persistence/persistence";
import {
  RestTimer,
  startRest,
  pauseRest,
  resumeRest,
  resetRest,
} from "../util/restTimer";

type Persist = (state: PersistedState) => void;
type OnRestDurationChange = (durationMs: number) => void;
type OnSessionChange = (session: {
  id: string;
  startedAt: number;
  endedAt: number | null;
}) => void;

export type SessionSummary = {
  id: string;
  startedAt: number;
  endedAt: number | null;
  exerciseCount: number;
  durationMs: number;
};

export type ExerciseHistory = {
  // Every session in which this exercise was performed (≥1 set), newest-first.
  sessions: {
    id: string;
    startedAt: number;
    sets: { reps: number; weight: number; setNumber: number }[];
  }[];
  // Top-set weight per session for the last 10 sessions, chronological
  // (oldest → newest) to feed the sparkline left-to-right.
  topSetWeights: number[];
};

// The "top set" of a session: highest weight, ties broken by reps descending,
// then by setNumber descending. Returns undefined for an empty set list.
export function pickTopSet(sets: Set[]): Set | undefined {
  if (sets.length === 0) return undefined;
  return sets.reduce((best, s) => {
    if (s.weight !== best.weight) return s.weight > best.weight ? s : best;
    if (s.reps !== best.reps) return s.reps > best.reps ? s : best;
    return s.setNumber > best.setNumber ? s : best;
  });
}

export type WorkoutState = PersistedState;

export type WorkoutActions = {
  startSession: () => void;
  endSession: () => void;
  addExerciseToSession: (exerciseId: string) => void;
  removeExerciseFromSession: (sessionExerciseId: string) => void;
  logSet: (sessionExerciseId: string, reps: number, weight: number) => void;
  updateSet: (setId: string, patch: { reps?: number; weight?: number }) => void;
  deleteSet: (setId: string) => void;
  getLastSetFor: (exerciseId: string) => { reps: number; weight: number } | null;
  getSessionsList: () => SessionSummary[];
  getHistoryFor: (exerciseId: string) => ExerciseHistory;
  setRestDuration: (durationMs: number) => void;
  startRestTimer: (now?: number) => void;
  pauseRestTimer: (now?: number) => void;
  resumeRestTimer: (now?: number) => void;
  resetRestTimer: (now?: number) => void;
  hydrate: (state: PersistedState) => void;
};

// restTimer is ephemeral (in-session) state: it is NOT persisted, so it is kept
// outside PersistedState and excluded from snapshot().
export type WorkoutStore = WorkoutState & { restTimer: RestTimer } & WorkoutActions;

export const initialState: WorkoutState = {
  schemaVersion: SCHEMA_VERSION,
  activeSession: null,
  history: [],
  restDurationMs: DEFAULT_REST_DURATION_MS,
};

// Apply fn to every session (active + history). Set edit/delete intentionally
// make no active/historical distinction — a set is found by id wherever it lives.
function mapSessions(state: WorkoutState, fn: (s: Session) => Session): WorkoutState {
  return {
    ...state,
    activeSession: state.activeSession ? fn(state.activeSession) : null,
    history: state.history.map(fn),
  };
}

// Apply fn to the set list of every exercise across all sessions.
function mapSessionSets(
  state: WorkoutState,
  fn: (sets: Set[]) => Set[]
): WorkoutState {
  return mapSessions(state, (session) => ({
    ...session,
    sessionExercises: session.sessionExercises.map((se) => ({
      ...se,
      sets: fn(se.sets),
    })),
  }));
}

// Every session including the in-progress one — for reads that span
// "everything ever performed" rather than just ended history.
function allSessions(state: WorkoutState): Session[] {
  return state.activeSession
    ? [...state.history, state.activeSession]
    : state.history;
}

function snapshot(state: WorkoutState): PersistedState {
  return {
    schemaVersion: state.schemaVersion,
    activeSession: state.activeSession,
    history: state.history,
    restDurationMs: state.restDurationMs,
  };
}

const defaultPersist: Persist = (state) => {
  void saveState(state).catch(() => {
    // Persistence failures are non-fatal for an in-progress session.
  });
};

const defaultOnRestDurationChange: OnRestDurationChange = (durationMs) => {
  const syncEngine = require("../sync/syncEngine");
  void syncEngine.setUserSetting(durationMs).catch(() => {});
};

const defaultOnSessionChange: OnSessionChange = (session) => {
  const syncEngine = require("../sync/syncEngine");
  void syncEngine.upsertSession(session).catch(() => {});
};

export function createWorkoutStore(
  persist: Persist = defaultPersist,
  onRestDurationChange: OnRestDurationChange = defaultOnRestDurationChange,
  onSessionChange: OnSessionChange = defaultOnSessionChange
) {
  return createStore<WorkoutStore>((set, get) => {
    // Apply a state update then persist the resulting snapshot.
    const commit = (next: WorkoutState) => {
      set(next);
      persist(snapshot(get()));
    };

    return {
      ...initialState,
      restTimer: { status: "idle", durationMs: initialState.restDurationMs },

      startSession: () => {
        if (get().activeSession !== null) {
          throw new Error("A session is already active");
        }
        const session: Session = {
          id: genId(),
          startedAt: Date.now(),
          endedAt: null,
          sessionExercises: [],
        };
        commit({ ...get(), activeSession: session });
        onSessionChange({
          id: session.id,
          startedAt: session.startedAt,
          endedAt: session.endedAt,
        });
      },

      endSession: () => {
        const active = get().activeSession;
        if (active === null) {
          throw new Error("No active session to end");
        }
        const ended: Session = { ...active, endedAt: Date.now() };
        commit({
          ...get(),
          activeSession: null,
          history: [...get().history, ended],
        });
        onSessionChange({
          id: ended.id,
          startedAt: ended.startedAt,
          endedAt: ended.endedAt,
        });
      },

      addExerciseToSession: (exerciseId) => {
        const active = get().activeSession;
        if (active === null) {
          throw new Error("No active session");
        }
        const sessionExercise: SessionExercise = {
          id: genId(),
          exerciseId,
          order: active.sessionExercises.length,
          sets: [],
        };
        commit({
          ...get(),
          activeSession: {
            ...active,
            sessionExercises: [...active.sessionExercises, sessionExercise],
          },
        });
      },

      removeExerciseFromSession: (sessionExerciseId) => {
        const active = get().activeSession;
        if (active === null) {
          throw new Error("No active session");
        }
        commit({
          ...get(),
          activeSession: {
            ...active,
            sessionExercises: active.sessionExercises.filter(
              (se) => se.id !== sessionExerciseId
            ),
          },
        });
      },

      logSet: (sessionExerciseId, reps, weight) => {
        const active = get().activeSession;
        if (active === null) {
          throw new Error("No active session");
        }
        const sessionExercises = active.sessionExercises.map((se) => {
          if (se.id !== sessionExerciseId) return se;
          return {
            ...se,
            sets: [
              ...se.sets,
              {
                id: genId(),
                setNumber: se.sets.length + 1,
                reps,
                weight,
              },
            ],
          };
        });
        commit({
          ...get(),
          activeSession: { ...active, sessionExercises },
        });
        // Logging a set auto-starts the rest countdown so the user never has to
        // remember to tap "start" while catching their breath.
        set({ restTimer: startRest(get().restDurationMs, Date.now()) });
      },

      updateSet: (setId, patch) => {
        commit(
          mapSessionSets(get(), (sets) =>
            sets.map((s) => (s.id === setId ? { ...s, ...patch } : s))
          )
        );
      },

      deleteSet: (setId) => {
        // Siblings keep their setNumber: setNumber is a logged value, not a
        // derived index, so removal never renumbers the remaining sets.
        commit(
          mapSessionSets(get(), (sets) => sets.filter((s) => s.id !== setId))
        );
      },

      getLastSetFor: (exerciseId) => {
        // Most recent session first; the active session and history are both
        // ordered by startedAt rather than array position.
        const byRecency = [...allSessions(get())].sort(
          (a, b) => b.startedAt - a.startedAt
        );
        for (const session of byRecency) {
          const sets = session.sessionExercises
            .filter((se) => se.exerciseId === exerciseId)
            .flatMap((se) => se.sets);
          if (sets.length === 0) continue;
          const latest = sets.reduce((best, s) =>
            s.setNumber > best.setNumber ? s : best
          );
          return { reps: latest.reps, weight: latest.weight };
        }
        return null;
      },

      getSessionsList: () =>
        // History holds only ended sessions (the active session lives in
        // activeSession), so mapping it naturally excludes the in-progress one.
        // Sort by startedAt rather than trusting array order.
        [...get().history]
          .sort((a, b) => b.startedAt - a.startedAt)
          .map((s) => ({
            id: s.id,
            startedAt: s.startedAt,
            endedAt: s.endedAt,
            exerciseCount: s.sessionExercises.length,
            durationMs: (s.endedAt ?? s.startedAt) - s.startedAt,
          })),

      getHistoryFor: (exerciseId) => {
        // Spans every session including the active one — "all sets ever
        // performed for this exercise" (PRD). Keep only sessions with ≥1 set
        // for this exercise (a session may add an exercise but log nothing).
        const matched = allSessions(get())
          .map((session) => ({
            id: session.id,
            startedAt: session.startedAt,
            sets: session.sessionExercises
              .filter((se) => se.exerciseId === exerciseId)
              .flatMap((se) => se.sets),
          }))
          .filter((m) => m.sets.length > 0);

        const chronological = [...matched].sort(
          (a, b) => a.startedAt - b.startedAt
        );
        const topSetWeights = chronological
          .slice(-10)
          .map((m) => pickTopSet(m.sets)!.weight);

        const sessions = [...matched]
          .sort((a, b) => b.startedAt - a.startedAt)
          .map((m) => ({
            id: m.id,
            startedAt: m.startedAt,
            sets: m.sets.map((s) => ({
              reps: s.reps,
              weight: s.weight,
              setNumber: s.setNumber,
            })),
          }));

        return { sessions, topSetWeights };
      },

      setRestDuration: (durationMs) => {
        commit({ ...get(), restDurationMs: durationMs });
        if (get().restTimer.status === "idle") {
          set({ restTimer: { status: "idle", durationMs } });
        }
        onRestDurationChange(durationMs);
      },

      startRestTimer: (now = Date.now()) => {
        set({ restTimer: startRest(get().restDurationMs, now) });
      },

      pauseRestTimer: (now = Date.now()) => {
        set({ restTimer: pauseRest(get().restTimer, now) });
      },

      resumeRestTimer: (now = Date.now()) => {
        set({ restTimer: resumeRest(get().restTimer, now) });
      },

      resetRestTimer: (now = Date.now()) => {
        set({ restTimer: resetRest(get().restTimer, now) });
      },

      hydrate: (state) => {
        // Adopt the persisted rest-duration default into the idle timer too.
        set({
          ...get(),
          ...state,
          restTimer: { status: "idle", durationMs: state.restDurationMs },
        });
      },
    };
  });
}

export const workoutStore = createWorkoutStore();

export function useWorkoutStore<T>(selector: (state: WorkoutStore) => T): T {
  return useStore(workoutStore, selector);
}
