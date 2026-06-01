import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "../supabase/supabaseClient";
import { reconcile } from "./reconciler";
import { createMutationQueue } from "./mutationQueue";
import * as localMirror from "./localMirror";
import { setSyncPaused } from "./syncStatus";
import { genId } from "../util/id";
import { UserSettingsRow, Mutation } from "./types";

const queue = createMutationQueue({
  onPause: () => {
    setSyncPaused(true);
  },
});

async function handleMutation(mutation: Mutation): Promise<void> {
  if (!supabase) {
    throw Object.assign(new Error("Supabase not configured"), { status: 500 });
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw Object.assign(new Error("Not authenticated"), { status: 401 });
  }

  const { error } = await supabase.from(mutation.table).upsert(mutation.row);
  if (error) {
    throw Object.assign(new Error(error.message), { status: 500 });
  }
}

export async function setUserSetting(
  restDurationMs: number
): Promise<void> {
  if (!supabase) return;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return;

  const now = new Date().toISOString();
  const row: UserSettingsRow = {
    id: userId,
    rest_duration_ms: restDurationMs,
    updated_at: now,
    deleted_at: null,
  };

  await localMirror.writeUserSettings(row);
  await queue.enqueue({
    id: genId(),
    table: "user_settings",
    row: {
      user_id: userId,
      rest_duration_ms: restDurationMs,
      updated_at: now,
      deleted_at: null,
    },
    enqueuedAt: now,
  });
  void queue.drain(handleMutation);
}

export async function loadUserSettings(): Promise<UserSettingsRow | null> {
  return localMirror.loadUserSettings();
}

export async function pull(): Promise<UserSettingsRow | null> {
  if (!supabase) return null;

  const lastPulledAt = await localMirror.loadLastPulledAt();

  let query = supabase.from("user_settings").select("*");
  if (lastPulledAt) {
    query = query.gt("updated_at", lastPulledAt);
  }

  const { data: remoteRows, error } = await query;
  if (error || !remoteRows) return localMirror.loadUserSettings();

  const mappedRemote: UserSettingsRow[] = remoteRows.map(
    (r: Record<string, unknown>) => ({
      id: r.user_id as string,
      rest_duration_ms: r.rest_duration_ms as number,
      updated_at: r.updated_at as string,
      deleted_at: (r.deleted_at as string) ?? null,
    })
  );

  const localRow = await localMirror.loadRawUserSettings();
  const localRows: UserSettingsRow[] = localRow ? [localRow] : [];

  const result = reconcile(localRows, mappedRemote);

  for (const row of result.writes) {
    await localMirror.writeUserSettings(row);
  }

  for (const row of result.enqueues) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) continue;

    await queue.enqueue({
      id: genId(),
      table: "user_settings",
      row: {
        user_id: userId,
        rest_duration_ms: row.rest_duration_ms,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at,
      },
      enqueuedAt: new Date().toISOString(),
    });
  }

  if (mappedRemote.length > 0) {
    const maxUpdatedAt = mappedRemote.reduce(
      (max, r) => (r.updated_at > max ? r.updated_at : max),
      mappedRemote[0].updated_at
    );
    await localMirror.saveLastPulledAt(maxUpdatedAt);
  }

  void queue.drain(handleMutation);

  return localMirror.loadUserSettings();
}

export async function signIn(
  email: string,
  password: string,
  seedRestDurationMs?: number
): Promise<{
  error: { message: string } | null;
  userSettings: UserSettingsRow | null;
}> {
  if (!supabase) {
    return { error: { message: "Supabase not configured" }, userSettings: null };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) return { error: { message: error.message }, userSettings: null };

  const userId = data.user.id;

  // Seed local mirror if empty (preserves existing restDurationMs through upgrade).
  const existing = await localMirror.loadRawUserSettings();
  if (!existing && seedRestDurationMs !== undefined) {
    const now = new Date().toISOString();
    await localMirror.writeUserSettings({
      id: userId,
      rest_duration_ms: seedRestDurationMs,
      updated_at: now,
      deleted_at: null,
    });
  }

  if (queue.isPaused()) {
    queue.resume();
    setSyncPaused(false);
  }

  const userSettings = await pull();
  return { error: null, userSettings };
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
  callback: (event: AuthChangeEvent, session: Session | null) => void
): () => void {
  if (!supabase) return () => {};

  const { data: sub } = supabase.auth.onAuthStateChange(callback);
  return () => sub.subscription.unsubscribe();
}

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export function resumeSync(): void {
  queue.resume();
  setSyncPaused(false);
  void queue.drain(handleMutation);
}
