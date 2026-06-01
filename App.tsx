import { useEffect, useState, useCallback } from "react";
import { View, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Linking from "expo-linking";
import type { Session } from "@supabase/supabase-js";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { SignInScreen } from "./src/screens/SignInScreen";
import { SignUpScreen } from "./src/screens/SignUpScreen";
import { VerifyEmailScreen } from "./src/screens/VerifyEmailScreen";
import { workoutStore } from "./src/store/workoutStore";
import { loadState } from "./src/persistence/persistence";
import { supabase, supabaseConfigError } from "./src/supabase/supabaseClient";
import { extractAuthCode } from "./src/supabase/authUtils";
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import './global.css';

type AuthScreen = "sign-in" | "sign-up" | "verify-email";

export default function App() {
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authScreen, setAuthScreen] = useState<AuthScreen>("sign-in");
  const [pendingEmail, setPendingEmail] = useState("");

  useEffect(() => {
    let cancelled = false;
    loadState().then((state) => {
      if (cancelled) return;
      if (state !== null) {
        workoutStore.getState().hydrate(state);
      }
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDeepLink = useCallback(
    async (url: string) => {
      if (supabase === null) return;
      const code = extractAuthCode(url);
      if (code === null) return;
      await supabase.auth.exchangeCodeForSession(code);
    },
    [],
  );

  useEffect(() => {
    if (supabase === null) {
      setAuthReady(true);
      return;
    }
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });
    const linkSub = Linking.addEventListener("url", (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      linkSub.remove();
    };
  }, [handleDeepLink]);

  const onNavigateSignUp = useCallback(() => setAuthScreen("sign-up"), []);
  const onNavigateSignIn = useCallback(() => setAuthScreen("sign-in"), []);
  const onSignUpSuccess = useCallback((email: string) => {
    setPendingEmail(email);
    setAuthScreen("verify-email");
  }, []);

  if (supabaseConfigError !== null) {
    return <ConfigErrorScreen message={supabaseConfigError} />;
  }

  if (!hydrated || !authReady) {
    return (
      <View className="flex-1 items-center justify-center bg-page">
        <Text className="text-primary">Loading…</Text>
      </View>
    );
  }

  return (
    <GluestackUIProvider mode="dark">
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          {session === null ? (
            <AuthFlow
              screen={authScreen}
              pendingEmail={pendingEmail}
              onNavigateSignIn={onNavigateSignIn}
              onNavigateSignUp={onNavigateSignUp}
              onSignUpSuccess={onSignUpSuccess}
            />
          ) : (
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          )}
          <StatusBar style="light" />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </GluestackUIProvider>
  );
}

function AuthFlow({
  screen,
  pendingEmail,
  onNavigateSignIn,
  onNavigateSignUp,
  onSignUpSuccess,
}: {
  screen: AuthScreen;
  pendingEmail: string;
  onNavigateSignIn: () => void;
  onNavigateSignUp: () => void;
  onSignUpSuccess: (email: string) => void;
}) {
  switch (screen) {
    case "sign-up":
      return (
        <SignUpScreen
          onNavigateSignIn={onNavigateSignIn}
          onSignUpSuccess={onSignUpSuccess}
        />
      );
    case "verify-email":
      return (
        <VerifyEmailScreen
          email={pendingEmail}
          onNavigateSignIn={onNavigateSignIn}
        />
      );
    case "sign-in":
    default:
      return <SignInScreen onNavigateSignUp={onNavigateSignUp} />;
  }
}

function ConfigErrorScreen({ message }: { message: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-page p-6">
      <Text className="text-danger-accent-text text-lg font-bold mb-2">
        Configuration error
      </Text>
      <Text className="text-secondary text-center">{message}</Text>
    </View>
  );
}
