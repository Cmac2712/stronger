const CALLBACK_PREFIXES = [
  "stronger://auth/callback",
  "exp+stronger://auth/callback",
];

export function extractAuthCode(url: string): string | null {
  for (const prefix of CALLBACK_PREFIXES) {
    if (url.startsWith(prefix)) {
      const qs = url.split("?")[1];
      if (!qs) return null;
      const params = new URLSearchParams(qs);
      return params.get("code");
    }
  }
  return null;
}

const MIN_PASSWORD_LENGTH = 6;

export type SignUpValidation =
  | { valid: true }
  | { valid: false; error: string };

export function validateSignUp(
  email: string,
  password: string,
  confirmPassword: string,
): SignUpValidation {
  if (!email.trim()) {
    return { valid: false, error: "Email is required." };
  }
  if (password !== confirmPassword) {
    return { valid: false, error: "Passwords do not match." };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  return { valid: true };
}
