import { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { supabase } from "../supabase/supabaseClient";
import { validateSignUp } from "../supabase/authUtils";
import { colors } from "../theme";

type Props = {
  onNavigateSignIn: () => void;
  onSignUpSuccess: (email: string) => void;
};

const EMAIL_REDIRECT_TO = "stronger://auth/callback";

export function SignUpScreen({ onNavigateSignIn, onSignUpSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (supabase === null || submitting) return;

    const validation = validateSignUp(email, password, confirmPassword);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setSubmitting(true);
    setError(null);

    const trimmedEmail = email.trim();
    const { error: signUpError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: { emailRedirectTo: EMAIL_REDIRECT_TO },
    });

    setSubmitting(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    onSignUpSuccess(trimmedEmail);
  };

  return (
    <View className="flex-1 bg-page items-center justify-center p-6">
      <View className="w-full max-w-sm">
        <Text className="text-3xl font-bold text-primary mb-1">Stronger</Text>
        <Text className="text-sm text-muted mb-8">Create your account</Text>

        <Text className="text-xs text-secondary mb-1">Email</Text>
        <TextInput
          testID="email-input"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor={colors.muted}
          keyboardAppearance="dark"
          className="bg-card border border-subtle rounded-control px-4 py-3 mb-4 text-primary"
          style={{ color: colors.primary }}
        />

        <Text className="text-xs text-secondary mb-1">Password</Text>
        <TextInput
          testID="password-input"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          placeholder="••••••••"
          placeholderTextColor={colors.muted}
          keyboardAppearance="dark"
          className="bg-card border border-subtle rounded-control px-4 py-3 mb-4 text-primary"
          style={{ color: colors.primary }}
        />

        <Text className="text-xs text-secondary mb-1">Confirm password</Text>
        <TextInput
          testID="confirm-password-input"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          placeholder="••••••••"
          placeholderTextColor={colors.muted}
          keyboardAppearance="dark"
          className="bg-card border border-subtle rounded-control px-4 py-3 text-primary"
          style={{ color: colors.primary }}
        />

        {error !== null && (
          <Text testID="auth-error" className="text-danger-accent-text text-sm mt-3">{error}</Text>
        )}

        <Pressable
          testID="signup-submit"
          onPress={onSubmit}
          disabled={submitting}
          className="bg-primary-accent rounded-control py-4 items-center mt-6"
          style={{ opacity: submitting ? 0.6 : 1 }}
        >
          <Text className="text-on-accent font-bold text-base">
            {submitting ? "Creating account…" : "Sign Up"}
          </Text>
        </Pressable>

        <Pressable testID="goto-signin" onPress={onNavigateSignIn} className="mt-6 items-center">
          <Text className="text-muted text-sm">
            Already have an account?{" "}
            <Text className="text-primary-accent-text font-semibold">
              Sign in
            </Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
