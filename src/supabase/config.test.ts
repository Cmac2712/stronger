import { resolveSupabaseConfig } from "./config";

describe("resolveSupabaseConfig", () => {
  const valid = {
    url: "https://abc.supabase.co",
    anonKey: "anon-key-123",
  };

  it("returns the config when both env vars are present", () => {
    const result = resolveSupabaseConfig(valid);
    expect(result).toEqual({ ok: true, config: valid });
  });

  it.each([
    ["url missing", { url: undefined, anonKey: valid.anonKey }, ["EXPO_PUBLIC_SUPABASE_URL"]],
    ["anonKey missing", { url: valid.url, anonKey: undefined }, ["EXPO_PUBLIC_SUPABASE_ANON_KEY"]],
    [
      "both missing",
      { url: undefined, anonKey: undefined },
      ["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_ANON_KEY"],
    ],
  ])("reports an error when %s", (_label, env, missing) => {
    const result = resolveSupabaseConfig(env);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected error result");
    expect(result.missing).toEqual(missing);
    // The message names every missing variable so the developer can fix it.
    for (const name of missing) {
      expect(result.message).toContain(name);
    }
  });

  it.each([
    ["empty url", { url: "", anonKey: valid.anonKey }],
    ["whitespace anonKey", { url: valid.url, anonKey: "   " }],
  ])("treats %s as missing", (_label, env) => {
    const result = resolveSupabaseConfig(env);
    expect(result.ok).toBe(false);
  });
});
