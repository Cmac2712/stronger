import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";
import {
  PersistedState,
  SCHEMA_VERSION,
  Session,
  SessionExercise,
} from "../types";
import { genId } from "../util/id";
import { saveState } from "../persistence/persistence";

type Persist = (state: PersistedState) => void;

export type SessionSummary = {
  id: string;
  startedAt: number;
  endedAt: number | null;
  exerciseCount: number;
  durationMs: number;
};

export type WorkoutState = PersistedState;

export type WorkoutActions = {
  startSession: () => void;
  endSession: () => void;
  addExerciseToSession: (exerciseId: string) => void;
  removeExerciseFromSession: (sessionExerciseId: string) => void;
  logSet: (sessionExerciseId: string, reps: number, weight: number) => void;
  getLastSetFor: (exerciseId: string) => { reps: number; weight: number } | null;
  getSessionsList: () => SessionSummary[];
  hydrate: (state: PersistedState) => void;
};

export type WorkoutStore = WorkoutState & WorkoutActions;

export const initialState: WorkoutState = {
  schemaVersion: SCHEMA_VERSION,
  activeSession: null,
  history: [],
};

function snapshot(state: WorkoutState): PersistedState {
  return {
    schemaVersion: state.schemaVersion,
    activeSession: state.activeSession,
    history: state.history,
  };
}

const defaultPersist: Persist = (state) => {
  void saveState(state).catch(() => {
    // Persistence failures are non-fatal for an in-progress session.
  });
};

export function createWorkoutStore(persist: Persist = defaultPersist) {
  return createStore<WorkoutStore>((set, get) => {
    // Apply a state update then persist the resulting snapshot.
    const commit = (next: WorkoutState) => {
      set(next);
      persist(snapshot(get()));
    };

    return {
      ...initialState,

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
      },

      getLastSetFor: (exerciseId) => {
        const state = get();
        const sessions = state.activeSession
          ? [...state.history, state.activeSession]
          : state.history;
        // Most recent session first; the active session and history are both
        // ordered by startedAt rather than array position.
        const byRecency = [...sessions].sort(
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

      hydrate: (state) => {
        set({ ...get(), ...state });
      },
    };
  });
}

export const workoutStore = createWorkoutStore();

export function useWorkoutStore<T>(selector: (state: WorkoutStore) => T): T {
  return useStore(workoutStore, selector);
}
