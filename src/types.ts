export type Set = {
  id: string;
  setNumber: number;
  reps: number;
  weight: number; // kg, decimal allowed
};

export type SessionExercise = {
  id: string;
  exerciseId: string; // FK into exerciseLibrary
  order: number;
  sets: Set[];
};

export type Session = {
  id: string;
  startedAt: number; // epoch ms
  endedAt: number | null;
  sessionExercises: SessionExercise[];
};

export const DEFAULT_REST_DURATION_MS = 120_000;

export type PersistedState = {
  activeSession: Session | null;
  history: Session[];
  restDurationMs: number;
};
