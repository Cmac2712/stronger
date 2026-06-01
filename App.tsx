import { useEffect, useState } from "react";
import { View, Text, Pressable, AppState } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import type { Session } from "@supabase/supabase-js";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { SignInScreen } from "./src/screens/SignInScreen";
import { workoutStore } from "./src/store/workoutStore";
import { loadState } from "./src/persistence/persistence";
import { supabaseConfigError } from "./src/supabase/supabaseClient";
import * as syncEngine from "./src/sync/syncEngine";
import { onSyncStatusChange } from "./src/sync/syncStatus";
import { colors } from "./src/theme";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import "./global.css";

export default function App() {
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [syncPaused, setSyncPaused] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadState(), syncEngine.loadUserSettings()]).then(
      ([oldState, userSettings]) => {
        if (cancelled) return;
        if (oldState !== null) {
          const merged =
            userSettings !== null
              ? { ...oldState, restDurationMs: userSettings.rest_duration_ms }
              : oldState;
          workoutStore.getState().hydrate(merged);
        } else if (userSettings !== null) {
          workoutStore.getState().hydrate({
            schemaVersion: 1,
            activeSession: null,
            history: [],
            restDurationMs: userSettings.rest_duration_ms,
          });
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
    syncEngine.getSession().then((s) => {
      if (cancelled) return;
      setSession(s);
      setAuthReady(true);
    });
    const unsub = syncEngine.onAuthStateChanged((_event, next) => {
      setSession(next);
    });
    return () => {
      cancelled = true;
      unsub();
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
            <SignInScreen />
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
