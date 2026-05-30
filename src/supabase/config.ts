// Pure resolver for the Supabase connection settings. Kept separate from the
// client module (which pulls in @supabase/supabase-js and AsyncStorage) so the
// missing-env behaviour can be unit-tested without that runtime baggage.

export type SupabaseConfig = {
  url: string;
  anonKey: string;
};

type SupabaseEnv = {
  url: string | undefined;
  anonKey: string | undefined;
};

export type SupabaseConfigResult =
  | { ok: true; config: SupabaseConfig }
  | { ok: false; missing: string[]; message: string };

const VAR_NAMES = {
  url: "EXPO_PUBLIC_SUPABASE_URL",
  anonKey: "EXPO_PUBLIC_SUPABASE_ANON_KEY",
} as const;

export function resolveSupabaseConfig(env: SupabaseEnv): SupabaseConfigResult {
  const url = env.url?.trim();
  const anonKey = env.anonKey?.trim();

  const missing: string[] = [];
  if (!url) missing.push(VAR_NAMES.url);
  if (!anonKey) missing.push(VAR_NAMES.anonKey);

  if (missing.length > 0 || !url || !anonKey) {
    return {
      ok: false,
      missing,
      message:
        `Supabase is not configured. Set ${missing.join(" and ")} in your ` +
        `.env file (see the issue's HITL prerequisites) and restart the app.`,
    };
  }

  return { ok: true, config: { url, anonKey } };
}
