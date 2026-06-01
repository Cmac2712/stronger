import { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import * as syncEngine from "../sync/syncEngine";
import { workoutStore } from "../store/workoutStore";
import { colors } from "../theme";

type Props = {
  onNavigateSignUp: () => void;
};

export function SignInScreen({ onNavigateSignUp }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const store = workoutStore.getState();
    const allSessions = [
      ...store.history,
      ...(store.activeSession ? [store.activeSession] : []),
    ];
    const { error: signInError, userSettings } = await syncEngine.signIn(
      email,
      password,
      { restDurationMs: store.restDurationMs, sessions: allSessions }
    );
    if (signInError) {
      setError(signInError.message);
    } else if (userSettings) {
      workoutStore.setState({ restDurationMs: userSettings.rest_duration_ms });
    }
    setSubmitting(false);
  };

  return (
    <View className="flex-1 bg-page items-center justify-center p-6">
      <View className="w-full max-w-sm">
        <Text className="text-3xl font-bold text-primary mb-1">Stronger</Text>
        <Text className="text-sm text-muted mb-8">Sign in to continue</Text>

        <Text className="text-xs text-secondary mb-1">Email</Text>
        <TextInput
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
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password"
          placeholder="••••••••"
          placeholderTextColor={colors.muted}
          keyboardAppearance="dark"
          className="bg-card border border-subtle rounded-control px-4 py-3 text-primary"
          style={{ color: colors.primary }}
        />

        {error !== null && (
          <Text className="text-danger-accent-text text-sm mt-3">{error}</Text>
        )}

        <Pressable
          onPress={onSubmit}
          disabled={submitting}
          className="bg-primary-accent rounded-control py-4 items-center mt-6"
          style={{ opacity: submitting ? 0.6 : 1 }}
        >
          <Text className="text-on-accent font-bold text-base">
            {submitting ? "Signing in…" : "Sign In"}
          </Text>
        </Pressable>

        <Pressable onPress={onNavigateSignUp} className="mt-6 items-center">
          <Text className="text-muted text-sm">
            Don't have an account?{" "}
            <Text className="text-primary-accent-text font-semibold">
              Sign up
            </Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
