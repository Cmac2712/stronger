export type SyncableRow = {
  id: string;
  updated_at: string;
  deleted_at: string | null;
};

export type UserSettingsRow = SyncableRow & {
  rest_duration_ms: number;
};

export type SessionRow = SyncableRow & {
  user_id: string;
  started_at: number;
  ended_at: number | null;
};

export type SessionExerciseRow = SyncableRow & {
  user_id: string;
  session_id: string;
  exercise_id: string;
  order: number;
};

export type SetRow = SyncableRow & {
  user_id: string;
  session_exercise_id: string;
  set_number: number;
  reps: number;
  weight: number;
};

// Whole-row LWW is the conflict unit (ADR-0006): templates are replaced or
// deleted wholesale, so exercise_ids rides along as an ordered array column.
export type TemplateRow = SyncableRow & {
  user_id: string;
  name: string;
  exercise_ids: string[];
};

export type Mutation = {
  id: string;
  table: string;
  row: Record<string, unknown>;
  enqueuedAt: string;
};

export type ReconcileResult<T extends SyncableRow> = {
  writes: T[];
  enqueues: T[];
};
