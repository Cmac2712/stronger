import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, AppState } from "react-native";
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
import { initialState, workoutStore } from "./src/store/workoutStore";
import { loadState } from "./src/persistence/persistence";
import { supabase, supabaseConfigError } from "./src/supabase/supabaseClient";
import { extractAuthCode } from "./src/supabase/authUtils";
import * as syncEngine from "./src/sync/syncEngine";
import { onSyncStatusChange } from "./src/sync/syncStatus";
import { colors } from "./src/theme";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import "./global.css";

type AuthScreen = "sign-in" | "sign-up" | "verify-email";

export default function App() {
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authScreen, setAuthScreen] = useState<AuthScreen>("sign-in");
  const [pendingEmail, setPendingEmail] = useState("");
  const [syncPaused, setSyncPaused] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadState(), syncEngine.loadUserSettings()]).then(
      ([oldState, userSettings]) => {
        if (cancelled) return;
        const base = oldState ?? (userSettings !== null ? initialState : null);
        if (base !== null) {
          workoutStore.getState().hydrate(
            userSettings !== null
              ? { ...base, restDurationMs: userSettings.rest_duration_ms }
              : base
          );
        }
        setHydrated(true);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const exchangeCodeFromUrl = async (url: string) => {
      if (supabase === null) return;
      const code = extractAuthCode(url);
      if (code === null) return;
      await supabase.auth.exchangeCodeForSession(code);
    };

    syncEngine.getSession().then((s) => {
      if (cancelled) return;
      setSession(s);
      setAuthReady(true);
    });
    const unsub = syncEngine.onAuthStateChanged((_event, next) => {
      setSession(next);
    });

    Linking.getInitialURL().then((url) => {
      if (url) exchangeCodeFromUrl(url);
    });
    const linkSub = Linking.addEventListener("url", (event) => {
      exchangeCodeFromUrl(event.url);
    });

    return () => {
      cancelled = true;
      unsub();
      linkSub.remove();
    };
  }, []);

  useEffect(() => {
    return onSyncStatusChange(setSyncPaused);
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && session !== null) {
        void syncEngine.pull().then((settings) => {
          if (!settings) return;
          const store = workoutStore.getState();
          if (store.restDurationMs !== settings.rest_duration_ms) {
            workoutStore.setState({ restDurationMs: settings.rest_duration_ms });
          }
        });
      }
    });
    return () => sub.remove();
  }, [session]);

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
            <>
              {syncPaused && <SyncPausedBanner />}
              <NavigationContainer>
                <RootNavigator />
              </NavigationContainer>
            </>
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

function SyncPausedBanner() {
  return (
    <Pressable
      onPress={() => void syncEngine.signOut()}
      className="bg-danger px-4 py-3 items-center"
    >
      <Text style={{ color: colors["on-accent"] }} className="text-sm font-medium">
        Sync paused — please sign in again
      </Text>
    </Pressable>
  );
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
