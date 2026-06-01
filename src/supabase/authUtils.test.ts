import { extractAuthCode, validateSignUp } from "./authUtils";

describe("extractAuthCode", () => {
  it("extracts the code from a prod-scheme callback URL", () => {
    expect(
      extractAuthCode("stronger://auth/callback?code=abc123")
    ).toBe("abc123");
  });

  it("extracts the code from an Expo Go callback URL", () => {
    expect(
      extractAuthCode("exp+stronger://auth/callback?code=xyz789")
    ).toBe("xyz789");
  });

  it("returns null when the URL has no code parameter", () => {
    expect(
      extractAuthCode("stronger://auth/callback?other=val")
    ).toBeNull();
  });

  it("returns null for an unrelated URL", () => {
    expect(extractAuthCode("https://example.com/callback?code=abc")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(extractAuthCode("")).toBeNull();
  });

  it("handles extra query parameters alongside code", () => {
    expect(
      extractAuthCode("stronger://auth/callback?foo=bar&code=c0de&baz=qux")
    ).toBe("c0de");
  });
});

describe("validateSignUp", () => {
  it("returns valid for a well-formed input", () => {
    expect(validateSignUp("a@b.co", "secret99", "secret99")).toEqual({
      valid: true,
    });
  });

  it("rejects an empty email", () => {
    const r = validateSignUp("", "secret99", "secret99");
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.error).toMatch(/email/i);
  });

  it("rejects a whitespace-only email", () => {
    const r = validateSignUp("   ", "secret99", "secret99");
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.error).toMatch(/email/i);
  });

  it("rejects mismatched passwords", () => {
    const r = validateSignUp("a@b.co", "secret99", "secret00");
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.error).toMatch(/match/i);
  });

  it("rejects a password below minimum length (6 characters)", () => {
    const r = validateSignUp("a@b.co", "short", "short");
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.error).toMatch(/6/);
  });

  it("accepts a password exactly at the minimum length", () => {
    expect(validateSignUp("a@b.co", "123456", "123456")).toEqual({
      valid: true,
    });
  });
});
