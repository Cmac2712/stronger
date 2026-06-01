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
import { DEFAULT_REST_DURATION_MS } from "./src/types";
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
    Promise.all([loadState(), syncEngine.loadState()]).then(
      ([oldState, syncState]) => {
        if (cancelled) return;
        const hasSyncData =
          syncState.restDurationMs !== DEFAULT_REST_DURATION_MS ||
          syncState.history.length > 0 ||
          syncState.activeSession !== null;
        const base = oldState ?? (hasSyncData ? initialState : null);
        if (base !== null) {
          const merged = { ...base };
          if (hasSyncData) {
            merged.restDurationMs = syncState.restDurationMs;
          }
          // Sessions and exercises from sync mirror take precedence;
          // sets still come from persistence until slice 6.
          if (syncState.history.length > 0 || syncState.activeSession !== null) {
            const setsMap = new Map<string, typeof base.history[number]["sessionExercises"][number]["sets"]>();
            for (const s of [...base.history, ...(base.activeSession ? [base.activeSession] : [])]) {
              for (const se of s.sessionExercises) {
                setsMap.set(se.id, se.sets);
              }
            }
            const attachSets = (s: typeof syncState.history[number]) => ({
              ...s,
              sessionExercises: s.sessionExercises.map((se) => ({
                ...se,
                sets: setsMap.get(se.id) ?? se.sets,
              })),
            });
            merged.history = syncState.history.map(attachSets);
            if (syncState.activeSession) {
              merged.activeSession = attachSets(syncState.activeSession);
            }
          }
          workoutStore.getState().hydrate(merged);
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
        void syncEngine.pull().then((pulled) => {
          const store = workoutStore.getState();
          if (
            pulled.userSettings &&
            store.restDurationMs !== pulled.userSettings.rest_duration_ms
          ) {
            workoutStore.setState({
              restDurationMs: pulled.userSettings.rest_duration_ms,
            });
          }
          if (pulled.sessions.length > 0 || pulled.sessionExercises.length > 0) {
            const setsMap = new Map<string, typeof store.history[number]["sessionExercises"][number]["sets"]>();
            for (const s of [
              ...store.history,
              ...(store.activeSession ? [store.activeSession] : []),
            ]) {
              for (const se of s.sessionExercises) {
                setsMap.set(se.id, se.sets);
              }
            }

            const exercisesBySession = new Map<string, typeof store.history[number]["sessionExercises"]>();
            for (const se of pulled.sessionExercises) {
              const list = exercisesBySession.get(se.session_id) ?? [];
              list.push({
                id: se.id,
                exerciseId: se.exercise_id,
                order: se.order,
                sets: setsMap.get(se.id) ?? [],
              });
              exercisesBySession.set(se.session_id, list);
            }
            for (const [, list] of exercisesBySession) {
              list.sort((a, b) => a.order - b.order);
            }

            const buildSession = (r: typeof pulled.sessions[number]) => ({
              id: r.id,
              startedAt: r.started_at,
              endedAt: r.ended_at,
              sessionExercises: exercisesBySession.get(r.id) ?? [],
            });

            const history = pulled.sessions
              .filter((r) => r.ended_at !== null)
              .map(buildSession);
            const activeRow = pulled.sessions.find((r) => r.ended_at === null);
            const activeSession = activeRow
              ? buildSession(activeRow)
              : store.activeSession;
            workoutStore.setState({ history, activeSession });
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
