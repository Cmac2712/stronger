import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resolveSupabaseConfig } from "./config";

// Single configured Supabase instance for the whole app. URL + anon key come
// from EXPO_PUBLIC_* env vars (Expo inlines these at build time); the bare
// strings never appear hardcoded here. The session JWT is stored in
// AsyncStorage so it survives app launches.
//
// If the env vars are missing we do NOT throw at import time — that would crash
// the app before the UI can explain the problem. Instead `supabase` is null and
// `supabaseConfigError` carries a developer-facing message the auth gate renders.

const resolved = resolveSupabaseConfig({
  url: process.env.EXPO_PUBLIC_SUPABASE_URL,
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
});

export const supabase: SupabaseClient | null = resolved.ok
  ? createClient(resolved.config.url, resolved.config.anonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        flowType: "pkce",
        detectSessionInUrl: false,
      },
    })
  : null;

export const supabaseConfigError: string | null = resolved.ok
  ? null
  : resolved.message;
