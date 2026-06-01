import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserSettingsRow } from "./types";

const USER_SETTINGS_KEY = "workout/mirror/user_settings/v1";
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

export async function loadLastPulledAt(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_PULLED_AT_KEY);
}

export async function saveLastPulledAt(timestamp: string): Promise<void> {
  await AsyncStorage.setItem(LAST_PULLED_AT_KEY, timestamp);
}
