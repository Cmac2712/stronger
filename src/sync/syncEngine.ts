import type { AuthChangeEvent, Session as SupabaseSession } from "@supabase/supabase-js";
import { supabase } from "../supabase/supabaseClient";
import { reconcile } from "./reconciler";
import { createMutationQueue } from "./mutationQueue";
import * as localMirror from "./localMirror";
import { setSyncPaused } from "./syncStatus";
import { genId } from "../util/id";
import { UserSettingsRow, SessionRow, SessionExerciseRow, Mutation } from "./types";
import type { PersistedState, Session } from "../types";
import { SCHEMA_VERSION, DEFAULT_REST_DURATION_MS } from "../types";

const queue = createMutationQueue({
  onPause: () => {
    setSyncPaused(true);
  },
});

async function currentUserId(): Promise<string | undefined> {
  if (!supabase) return undefined;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id;
}

function buildUserSettingsMutation(
  userId: string,
  row: UserSettingsRow
): Mutation {
  return {
    id: genId(),
    table: "user_settings",
    row: {
      user_id: userId,
      rest_duration_ms: row.rest_duration_ms,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at,
    },
    enqueuedAt: new Date().toISOString(),
  };
}

function buildSessionMutation(userId: string, row: SessionRow): Mutation {
  return {
    id: genId(),
    table: "sessions",
    row: {
      id: row.id,
      user_id: userId,
      started_at: row.started_at,
      ended_at: row.ended_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at,
    },
    enqueuedAt: new Date().toISOString(),
  };
}

function buildSessionExerciseMutation(
  userId: string,
  row: SessionExerciseRow
): Mutation {
  return {
    id: genId(),
    table: "session_exercises",
    row: {
      id: row.id,
      user_id: userId,
      session_id: row.session_id,
      exercise_id: row.exercise_id,
      order: row.order,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at,
    },
    enqueuedAt: new Date().toISOString(),
  };
}

async function handleMutation(mutation: Mutation): Promise<void> {
  if (!supabase) {
    throw Object.assign(new Error("Supabase not configured"), { status: 500 });
  }

  const userId = await currentUserId();
  if (!userId) {
    throw Object.assign(new Error("Not authenticated"), { status: 401 });
  }

  const { error } = await supabase.from(mutation.table).upsert(mutation.row);
  if (error) {
    throw Object.assign(new Error(error.message), { status: 500 });
  }
}

export async function setUserSetting(restDurationMs: number): Promise<void> {
  if (!supabase) return;

  const userId = await currentUserId();
  if (!userId) return;

  const now = new Date().toISOString();
  const row: UserSettingsRow = {
    id: userId,
    rest_duration_ms: restDurationMs,
    updated_at: now,
    deleted_at: null,
  };

  await localMirror.writeUserSettings(row);
  await queue.enqueue(buildUserSettingsMutation(userId, row));
  void queue.drain(handleMutation);
}

export async function upsertSession(
  session: Pick<Session, "id" | "startedAt" | "endedAt">
): Promise<void> {
  if (!supabase) return;

  const userId = await currentUserId();
  if (!userId) return;

  const row: SessionRow = {
    id: session.id,
    user_id: userId,
    started_at: session.startedAt,
    ended_at: session.endedAt,
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  await localMirror.writeSession(row);
  await queue.enqueue(buildSessionMutation(userId, row));
  void queue.drain(handleMutation);
}

export async function tombstoneSession(sessionId: string): Promise<void> {
  if (!supabase) return;

  const userId = await currentUserId();
  if (!userId) return;

  const now = new Date().toISOString();
  const rows = await localMirror.loadRawSessions();
  const existing = rows.find((r) => r.id === sessionId);
  const row: SessionRow = {
    id: sessionId,
    user_id: userId,
    started_at: existing?.started_at ?? 0,
    ended_at: existing?.ended_at ?? null,
    updated_at: now,
    deleted_at: now,
  };

  await localMirror.writeSession(row);
  await queue.enqueue(buildSessionMutation(userId, row));
  void queue.drain(handleMutation);
}

export async function upsertSessionExercise(
  se: Pick<import("../types").SessionExercise, "id" | "exerciseId" | "order"> & {
    sessionId: string;
  }
): Promise<void> {
  if (!supabase) return;

  const userId = await currentUserId();
  if (!userId) return;

  const row: SessionExerciseRow = {
    id: se.id,
    user_id: userId,
    session_id: se.sessionId,
    exercise_id: se.exerciseId,
    order: se.order,
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  await localMirror.writeSessionExercise(row);
  await queue.enqueue(buildSessionExerciseMutation(userId, row));
  void queue.drain(handleMutation);
}

export async function tombstoneSessionExercise(
  sessionExerciseId: string
): Promise<void> {
  if (!supabase) return;

  const userId = await currentUserId();
  if (!userId) return;

  const now = new Date().toISOString();
  const rows = await localMirror.loadRawSessionExercises();
  const existing = rows.find((r) => r.id === sessionExerciseId);
  const row: SessionExerciseRow = {
    id: sessionExerciseId,
    user_id: userId,
    session_id: existing?.session_id ?? "",
    exercise_id: existing?.exercise_id ?? "",
    order: existing?.order ?? 0,
    updated_at: now,
    deleted_at: now,
  };

  await localMirror.writeSessionExercise(row);
  await queue.enqueue(buildSessionExerciseMutation(userId, row));
  void queue.drain(handleMutation);
}

export async function loadUserSettings(): Promise<UserSettingsRow | null> {
  return localMirror.loadUserSettings();
}

export async function pull(): Promise<{
  userSettings: UserSettingsRow | null;
  sessions: SessionRow[];
  sessionExercises: SessionExerciseRow[];
}> {
  if (!supabase) return { userSettings: null, sessions: [], sessionExercises: [] };

  const lastPulledAt = await localMirror.loadLastPulledAt();

  let settingsQuery = supabase.from("user_settings").select("*");
  if (lastPulledAt) {
    settingsQuery = settingsQuery.gt("updated_at", lastPulledAt);
  }

  let sessionsQuery = supabase.from("sessions").select("*");
  if (lastPulledAt) {
    sessionsQuery = sessionsQuery.gt("updated_at", lastPulledAt);
  }

  let sessionExercisesQuery = supabase.from("session_exercises").select("*");
  if (lastPulledAt) {
    sessionExercisesQuery = sessionExercisesQuery.gt("updated_at", lastPulledAt);
  }

  const [settingsResult, sessionsResult, sessionExercisesResult] = await Promise.all([
    settingsQuery,
    sessionsQuery,
    sessionExercisesQuery,
  ]);

  let maxUpdatedAt = lastPulledAt;

  // Reconcile user_settings
  if (!settingsResult.error && settingsResult.data) {
    const mappedRemote: UserSettingsRow[] = settingsResult.data.map(
      (r: Record<string, unknown>) => ({
        id: r.user_id as string,
        rest_duration_ms: r.rest_duration_ms as number,
        updated_at: r.updated_at as string,
        deleted_at: (r.deleted_at as string | null) ?? null,
      })
    );

    const localRow = await localMirror.loadRawUserSettings();
    const localRows: UserSettingsRow[] = localRow ? [localRow] : [];
    const result = reconcile(localRows, mappedRemote);

    for (const row of result.writes) {
      await localMirror.writeUserSettings(row);
    }

    if (result.enqueues.length > 0) {
      const userId = await currentUserId();
      if (userId) {
        for (const row of result.enqueues) {
          await queue.enqueue(buildUserSettingsMutation(userId, row));
        }
      }
    }

    for (const r of mappedRemote) {
      if (!maxUpdatedAt || r.updated_at > maxUpdatedAt) {
        maxUpdatedAt = r.updated_at;
      }
    }
  }

  // Reconcile sessions
  if (!sessionsResult.error && sessionsResult.data) {
    const mappedRemote: SessionRow[] = sessionsResult.data.map(
      (r: Record<string, unknown>) => ({
        id: r.id as string,
        user_id: r.user_id as string,
        started_at: r.started_at as number,
        ended_at: (r.ended_at as number | null) ?? null,
        updated_at: r.updated_at as string,
        deleted_at: (r.deleted_at as string | null) ?? null,
      })
    );

    const localRows = await localMirror.loadRawSessions();
    const result = reconcile(localRows, mappedRemote);

    for (const row of result.writes) {
      await localMirror.writeSession(row);
    }

    if (result.enqueues.length > 0) {
      const userId = await currentUserId();
      if (userId) {
        for (const row of result.enqueues) {
          await queue.enqueue(buildSessionMutation(userId, row));
        }
      }
    }

    for (const r of mappedRemote) {
      if (!maxUpdatedAt || r.updated_at > maxUpdatedAt) {
        maxUpdatedAt = r.updated_at;
      }
    }
  }

  // Reconcile session_exercises
  if (!sessionExercisesResult.error && sessionExercisesResult.data) {
    const mappedRemote: SessionExerciseRow[] = sessionExercisesResult.data.map(
      (r: Record<string, unknown>) => ({
        id: r.id as string,
        user_id: r.user_id as string,
        session_id: r.session_id as string,
        exercise_id: r.exercise_id as string,
        order: r.order as number,
        updated_at: r.updated_at as string,
        deleted_at: (r.deleted_at as string | null) ?? null,
      })
    );

    const localRows = await localMirror.loadRawSessionExercises();
    const result = reconcile(localRows, mappedRemote);

    for (const row of result.writes) {
      await localMirror.writeSessionExercise(row);
    }

    if (result.enqueues.length > 0) {
      const userId = await currentUserId();
      if (userId) {
        for (const row of result.enqueues) {
          await queue.enqueue(buildSessionExerciseMutation(userId, row));
        }
      }
    }

    for (const r of mappedRemote) {
      if (!maxUpdatedAt || r.updated_at > maxUpdatedAt) {
        maxUpdatedAt = r.updated_at;
      }
    }
  }

  if (maxUpdatedAt && maxUpdatedAt !== lastPulledAt) {
    await localMirror.saveLastPulledAt(maxUpdatedAt);
  }

  void queue.drain(handleMutation);

  const userSettings = await localMirror.loadUserSettings();
  const sessions = await localMirror.loadSessions();
  const sessionExercises = await localMirror.loadSessionExercises();
  return { userSettings, sessions, sessionExercises };
}

export async function loadState(): Promise<PersistedState> {
  const userSettings = await localMirror.loadUserSettings();
  const sessionRows = await localMirror.loadSessions();
  const exerciseRows = await localMirror.loadSessionExercises();

  const exercisesBySession = new Map<string, SessionExerciseRow[]>();
  for (const row of exerciseRows) {
    const list = exercisesBySession.get(row.session_id) ?? [];
    list.push(row);
    exercisesBySession.set(row.session_id, list);
  }

  const sessions: Session[] = sessionRows.map((r) => {
    const seRows = exercisesBySession.get(r.id) ?? [];
    seRows.sort((a, b) => a.order - b.order);
    return {
      id: r.id,
      startedAt: r.started_at,
      endedAt: r.ended_at,
      sessionExercises: seRows.map((se) => ({
        id: se.id,
        exerciseId: se.exercise_id,
        order: se.order,
        sets: [],
      })),
    };
  });

  const active = sessions.find((s) => s.endedAt === null) ?? null;
  const history = sessions.filter((s) => s.endedAt !== null);

  return {
    schemaVersion: SCHEMA_VERSION,
    activeSession: active,
    history,
    restDurationMs: userSettings?.rest_duration_ms ?? DEFAULT_REST_DURATION_MS,
  };
}

export async function signIn(
  email: string,
  password: string,
  seedState?: { restDurationMs: number; sessions: Session[] }
): Promise<{
  error: { message: string } | null;
  userSettings: UserSettingsRow | null;
  sessions: SessionRow[];
  sessionExercises: SessionExerciseRow[];
}> {
  if (!supabase) {
    return {
      error: { message: "Supabase not configured" },
      userSettings: null,
      sessions: [],
      sessionExercises: [],
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error)
    return { error: { message: error.message }, userSettings: null, sessions: [], sessionExercises: [] };

  const userId = data.user.id;

  const existing = await localMirror.loadRawUserSettings();
  if (!existing && seedState !== undefined) {
    const now = new Date().toISOString();
    await localMirror.writeUserSettings({
      id: userId,
      rest_duration_ms: seedState.restDurationMs,
      updated_at: now,
      deleted_at: null,
    });
  }

  // Seed sessions and session exercises from local persistence on first sign-in.
  if (seedState !== undefined) {
    const existingSessions = await localMirror.loadRawSessions();
    if (existingSessions.length === 0 && seedState.sessions.length > 0) {
      const now = new Date().toISOString();
      for (const s of seedState.sessions) {
        await localMirror.writeSession({
          id: s.id,
          user_id: userId,
          started_at: s.startedAt,
          ended_at: s.endedAt,
          updated_at: now,
          deleted_at: null,
        });
        for (const se of s.sessionExercises) {
          await localMirror.writeSessionExercise({
            id: se.id,
            user_id: userId,
            session_id: s.id,
            exercise_id: se.exerciseId,
            order: se.order,
            updated_at: now,
            deleted_at: null,
          });
        }
      }
    }
  }

  if (queue.isPaused()) {
    queue.resume();
    setSyncPaused(false);
  }

  const pulled = await pull();
  return {
    error: null,
    userSettings: pulled.userSettings,
    sessions: pulled.sessions,
    sessionExercises: pulled.sessionExercises,
  };
}

export async function signUp(
  email: string,
  password: string
): Promise<{ error: { message: string } | null }> {
  if (!supabase) {
    return { error: { message: "Supabase not configured" } };
  }

  const { error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  });
  if (error) return { error: { message: error.message } };
  return { error: null };
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export function onAuthStateChanged(
  callback: (event: AuthChangeEvent, session: SupabaseSession | null) => void
): () => void {
  if (!supabase) return () => {};

  const { data: sub } = supabase.auth.onAuthStateChange(callback);
  return () => sub.subscription.unsubscribe();
}

export async function getSession(): Promise<SupabaseSession | null> {
  if (!supabase) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}
