import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import type { Session } from "@supabase/supabase-js";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { SignInScreen } from "./src/screens/SignInScreen";
import { workoutStore } from "./src/store/workoutStore";
import { loadState } from "./src/persistence/persistence";
import { supabase, supabaseConfigError } from "./src/supabase/supabaseClient";
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import './global.css';

export default function App() {
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Local persistence is unchanged from Slice 0 — it still drives the store and
  // the UI. This slice only adds the auth gate around the navigator.
  useEffect(() => {
    let cancelled = false;
    loadState().then((state) => {
      if (cancelled) return;
      if (state !== null) {
        workoutStore.getState().hydrate(state);
      }
      setHydrated(true);
    });
    return (
      ) => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (supabase === null) {
      // Misconfigured: ConfigErrorScreen renders below. Don't block on auth.
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
    return (
      ) => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
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
            <SignInScreen />
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
