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

// A named, ordered list of library exercise ids — no sets or targets (PRD #39).
// Builtin templates are hardcoded in templateLibrary; user templates live in
// PersistedState and sync via the templates table (ADR-0006).
export type Template = {
  id: string;
  name: string;
  exerciseIds: string[]; // ordered FKs into exerciseLibrary
};

export const DEFAULT_REST_DURATION_MS = 120_000;

export type PersistedState = {
  activeSession: Session | null;
  history: Session[];
  templates: Template[]; // user templates only; builtin merge at read time
  restDurationMs: number;
};
