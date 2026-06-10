import { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { Eye, EyeOff, Lock, Mail } from "lucide-react-native";
import * as syncEngine from "@sync/syncEngine";
import { workoutStore } from "@state/workoutStore";
import { AuthBrandMark } from "./AuthBrandMark";
import { Icon } from "@shared/ui/Icon";
import { colors } from "@shared/theme";

type Props = {
  onNavigateSignUp: () => void;
};

export function SignInScreen({ onNavigateSignUp }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
        <AuthBrandMark />
        <Text className="text-3xl font-bold text-primary mb-1">Stronger</Text>
        <Text className="text-sm text-muted mb-8">Sign in to continue</Text>

        <Text className="text-xs text-secondary mb-1">Email</Text>
        <View className="flex-row items-center bg-card border border-subtle rounded-control px-4 mb-4">
          <Icon icon={Mail} color="muted" size={18} />
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
            className="flex-1 py-3 pl-3 text-primary"
            style={{ color: colors.primary }}
          />
        </View>

        <Text className="text-xs text-secondary mb-1">Password</Text>
        <View className="flex-row items-center bg-card border border-subtle rounded-control px-4">
          <Icon icon={Lock} color="muted" size={18} />
          <TextInput
            testID="password-input"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete="password"
            placeholder="••••••••"
            placeholderTextColor={colors.muted}
            keyboardAppearance="dark"
            className="flex-1 py-3 pl-3 text-primary"
            style={{ color: colors.primary }}
          />
          <Pressable
            testID="toggle-password-visibility"
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? "Hide password" : "Show password"}
          >
            <Icon icon={showPassword ? EyeOff : Eye} color="muted" size={18} />
          </Pressable>
        </View>

        {error !== null && (
          <Text testID="auth-error" className="text-danger-accent-text text-sm mt-3">{error}</Text>
        )}

        <Pressable
          testID="signin-submit"
          onPress={onSubmit}
          disabled={submitting}
          className="bg-primary-accent rounded-control py-4 items-center mt-6"
          style={{ opacity: submitting ? 0.6 : 1 }}
        >
          <Text className="text-on-accent font-bold text-base">
            {submitting ? "Signing in…" : "Sign In"}
          </Text>
        </Pressable>

        <Pressable testID="goto-signup" onPress={onNavigateSignUp} className="mt-6 items-center">
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
