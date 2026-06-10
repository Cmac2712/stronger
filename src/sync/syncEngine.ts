import type { AuthChangeEvent, Session as SupabaseSession } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";
import { reconcile } from "./reconciler";
import { createMutationQueue } from "./mutationQueue";
import * as localMirror from "./localMirror";
import { setSyncPaused } from "./syncStatus";
import { genId } from "@shared/lib/id";
import { UserSettingsRow, SessionRow, SessionExerciseRow, SetRow, Mutation, SyncableRow } from "./types";
import type { PersistedState, Session, SessionExercise } from "@shared/types";
import { DEFAULT_REST_DURATION_MS } from "@shared/types";

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

function buildSetMutation(userId: string, row: SetRow): Mutation {
  return {
    id: genId(),
    table: "sets",
    row: {
      id: row.id,
      user_id: userId,
      session_exercise_id: row.session_exercise_id,
      set_number: row.set_number,
      reps: row.reps,
      weight: row.weight,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at,
    },
    enqueuedAt: new Date().toISOString(),
  };
}

// Apply reconciler output for one table fetched in pull(): write remote-wins rows
// to local, enqueue local-newer rows for upload, and report the max remote
// updated_at so the caller can advance the pull cursor.
async function reconcileFetched<T extends SyncableRow>(
  result: { error: unknown; data: unknown[] | null },
  mapRow: (r: Record<string, unknown>) => T,
  loadLocal: () => Promise<T[]>,
  writeLocal: (row: T) => Promise<void>,
  buildMutation: (userId: string, row: T) => Mutation
): Promise<string | null> {
  if (result.error || !result.data) return null;

  const mappedRemote = (result.data as Record<string, unknown>[]).map(mapRow);
  const localRows = await loadLocal();
  const { writes, enqueues } = reconcile(localRows, mappedRemote);

  for (const row of writes) {
    await writeLocal(row);
  }

  if (enqueues.length > 0) {
    const userId = await currentUserId();
    if (userId) {
      for (const row of enqueues) {
        await queue.enqueue(buildMutation(userId, row));
      }
    }
  }

  let max: string | null = null;
  for (const r of mappedRemote) {
    if (!max || r.updated_at > max) max = r.updated_at;
  }
  return max;
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
  se: Pick<SessionExercise, "id" | "exerciseId" | "order"> & {
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

export async function upsertSet(
  s: { id: string; sessionExerciseId: string; setNumber: number; reps: number; weight: number }
): Promise<void> {
  if (!supabase) return;

  const userId = await currentUserId();
  if (!userId) return;

  const row: SetRow = {
    id: s.id,
    user_id: userId,
    session_exercise_id: s.sessionExerciseId,
    set_number: s.setNumber,
    reps: s.reps,
    weight: s.weight,
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  await localMirror.writeSet(row);
  await queue.enqueue(buildSetMutation(userId, row));
  void queue.drain(handleMutation);
}

export async function tombstoneSet(setId: string): Promise<void> {
  if (!supabase) return;

  const userId = await currentUserId();
  if (!userId) return;

  const now = new Date().toISOString();
  const rows = await localMirror.loadRawSets();
  const existing = rows.find((r) => r.id === setId);
  const row: SetRow = {
    id: setId,
    user_id: userId,
    session_exercise_id: existing?.session_exercise_id ?? "",
    set_number: existing?.set_number ?? 0,
    reps: existing?.reps ?? 0,
    weight: existing?.weight ?? 0,
    updated_at: now,
    deleted_at: now,
  };

  await localMirror.writeSet(row);
  await queue.enqueue(buildSetMutation(userId, row));
  void queue.drain(handleMutation);
}

export async function loadUserSettings(): Promise<UserSettingsRow | null> {
  return localMirror.loadUserSettings();
}

export async function pull(): Promise<{
  userSettings: UserSettingsRow | null;
  sessions: SessionRow[];
  sessionExercises: SessionExerciseRow[];
  sets: SetRow[];
}> {
  console.log('supabase: ', supabase)
  if (!supabase) return { userSettings: null, sessions: [], sessionExercises: [], sets: [] };

  const lastPulledAt = await localMirror.loadLastPulledAt();

  const sinceCursor = (table: string) => {
    let q = supabase!.from(table).select("*");
    if (lastPulledAt) q = q.gt("updated_at", lastPulledAt);
    return q;
  };

  const [settingsResult, sessionsResult, sessionExercisesResult, setsResult] = await Promise.all([
    sinceCursor("user_settings"),
    sinceCursor("sessions"),
    sinceCursor("session_exercises"),
    sinceCursor("sets"),
  ]);

  console.log('sessionResult: ', sessionsResult)

  let maxUpdatedAt = lastPulledAt;
  const advanceMax = (m: string | null) => {
    if (m && (!maxUpdatedAt || m > maxUpdatedAt)) maxUpdatedAt = m;
  };

  advanceMax(
    await reconcileFetched<UserSettingsRow>(
      settingsResult,
      (r) => ({
        id: r.user_id as string,
        rest_duration_ms: r.rest_duration_ms as number,
        updated_at: r.updated_at as string,
        deleted_at: (r.deleted_at as string | null) ?? null,
      }),
      async () => {
        const row = await localMirror.loadRawUserSettings();
        return row ? [row] : [];
      },
      localMirror.writeUserSettings,
      buildUserSettingsMutation
    )
  );

  advanceMax(
    await reconcileFetched<SessionRow>(
      sessionsResult,
      (r) => ({
        id: r.id as string,
        user_id: r.user_id as string,
        started_at: r.started_at as number,
        ended_at: (r.ended_at as number | null) ?? null,
        updated_at: r.updated_at as string,
        deleted_at: (r.deleted_at as string | null) ?? null,
      }),
      localMirror.loadRawSessions,
      localMirror.writeSession,
      buildSessionMutation
    )
  );

  advanceMax(
    await reconcileFetched<SessionExerciseRow>(
      sessionExercisesResult,
      (r) => ({
        id: r.id as string,
        user_id: r.user_id as string,
        session_id: r.session_id as string,
        exercise_id: r.exercise_id as string,
        order: r.order as number,
        updated_at: r.updated_at as string,
        deleted_at: (r.deleted_at as string | null) ?? null,
      }),
      localMirror.loadRawSessionExercises,
      localMirror.writeSessionExercise,
      buildSessionExerciseMutation
    )
  );

  advanceMax(
    await reconcileFetched<SetRow>(
      setsResult,
      (r) => ({
        id: r.id as string,
        user_id: r.user_id as string,
        session_exercise_id: r.session_exercise_id as string,
        set_number: r.set_number as number,
        reps: r.reps as number,
        weight: r.weight as number,
        updated_at: r.updated_at as string,
        deleted_at: (r.deleted_at as string | null) ?? null,
      }),
      localMirror.loadRawSets,
      localMirror.writeSet,
      buildSetMutation
    )
  );

  if (maxUpdatedAt && maxUpdatedAt !== lastPulledAt) {
    await localMirror.saveLastPulledAt(maxUpdatedAt);
  }

  void queue.drain(handleMutation);

  const userSettings = await localMirror.loadUserSettings();
  const sessions = await localMirror.loadSessions();
  const sessionExercises = await localMirror.loadSessionExercises();
  const sets = await localMirror.loadSets();
  return { userSettings, sessions, sessionExercises, sets };
}

// Stitch the three sync tables back into the nested in-memory Session shape.
// Used both for initial hydration from the local mirror and after a pull to
// rebuild the store from refreshed rows.
export function rowsToSessions(
  sessionRows: SessionRow[],
  exerciseRows: SessionExerciseRow[],
  setRows: SetRow[]
): Session[] {
  const setsByExercise = new Map<string, SetRow[]>();
  for (const row of setRows) {
    const list = setsByExercise.get(row.session_exercise_id) ?? [];
    list.push(row);
    setsByExercise.set(row.session_exercise_id, list);
  }

  const exercisesBySession = new Map<string, SessionExerciseRow[]>();
  for (const row of exerciseRows) {
    const list = exercisesBySession.get(row.session_id) ?? [];
    list.push(row);
    exercisesBySession.set(row.session_id, list);
  }

  return sessionRows.map((r) => {
    const seRows = exercisesBySession.get(r.id) ?? [];
    seRows.sort((a, b) => a.order - b.order);
    return {
      id: r.id,
      startedAt: r.started_at,
      endedAt: r.ended_at,
      sessionExercises: seRows.map((se) => {
        const sRows = setsByExercise.get(se.id) ?? [];
        sRows.sort((a, b) => a.set_number - b.set_number);
        return {
          id: se.id,
          exerciseId: se.exercise_id,
          order: se.order,
          sets: sRows.map((s) => ({
            id: s.id,
            setNumber: s.set_number,
            reps: s.reps,
            weight: s.weight,
          })),
        };
      }),
    };
  });
}

export async function loadState(): Promise<PersistedState> {
  const userSettings = await localMirror.loadUserSettings();
  const sessionRows = await localMirror.loadSessions();
  const exerciseRows = await localMirror.loadSessionExercises();
  const setRows = await localMirror.loadSets();

  const sessions = rowsToSessions(sessionRows, exerciseRows, setRows);
  const active = sessions.find((s) => s.endedAt === null) ?? null;
  const history = sessions.filter((s) => s.endedAt !== null);

  return {
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
  sets: SetRow[];
}> {
  if (!supabase) {
    return {
      error: { message: "Supabase not configured" },
      userSettings: null,
      sessions: [],
      sessionExercises: [],
      sets: [],
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error)
    return { error: { message: error.message }, userSettings: null, sessions: [], sessionExercises: [], sets: [] };

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

  // Seed sessions, exercises, and sets from local state on first sign-in.
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
          for (const set of se.sets) {
            await localMirror.writeSet({
              id: set.id,
              user_id: userId,
              session_exercise_id: se.id,
              set_number: set.setNumber,
              reps: set.reps,
              weight: set.weight,
              updated_at: now,
              deleted_at: null,
            });
          }
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
    sets: pulled.sets,
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
