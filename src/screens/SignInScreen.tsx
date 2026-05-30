import { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { supabase } from "../supabase/supabaseClient";
import { colors } from "../theme";

export function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (supabase === null || submitting) return;
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setError(signInError.message);
    }
    // On success the auth gate's onAuthStateChange swaps in the tabs; nothing
    // to do here. Keep the button disabled state tidy either way.
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
      </View>
    </View>
  );
}
