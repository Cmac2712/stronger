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
