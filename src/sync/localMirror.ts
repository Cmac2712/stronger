import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserSettingsRow, SessionRow } from "./types";

const USER_SETTINGS_KEY = "workout/mirror/user_settings/v1";
const SESSIONS_KEY = "workout/mirror/sessions/v1";
const LAST_PULLED_AT_KEY = "workout/sync/last_pulled_at/v1";

export async function loadRawUserSettings(): Promise<UserSettingsRow | null> {
  const raw = await AsyncStorage.getItem(USER_SETTINGS_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function loadUserSettings(): Promise<UserSettingsRow | null> {
  const row = await loadRawUserSettings();
  return row !== null && row.deleted_at === null ? row : null;
}

export async function writeUserSettings(row: UserSettingsRow): Promise<void> {
  await AsyncStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(row));
}

export async function loadRawSessions(): Promise<SessionRow[]> {
  const raw = await AsyncStorage.getItem(SESSIONS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function loadSessions(): Promise<SessionRow[]> {
  const rows = await loadRawSessions();
  return rows.filter((r) => r.deleted_at === null);
}

export async function writeSession(row: SessionRow): Promise<void> {
  const rows = await loadRawSessions();
  const idx = rows.findIndex((r) => r.id === row.id);
  if (idx >= 0) {
    rows[idx] = row;
  } else {
    rows.push(row);
  }
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(rows));
}

export async function loadLastPulledAt(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_PULLED_AT_KEY);
}

export async function saveLastPulledAt(timestamp: string): Promise<void> {
  await AsyncStorage.setItem(LAST_PULLED_AT_KEY, timestamp);
}
