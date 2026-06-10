import { useMemo } from "react";
import { FlatList, View, Text, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { History } from "lucide-react-native";
import { useWorkoutStore, workoutStore } from "@state/workoutStore";
import type { HistoryStackParamList } from "../../navigation/RootNavigator";
import { formatSessionDate, formatDuration } from "@shared/lib/format";
import { Icon } from "@shared/ui/Icon";

type Nav = NativeStackNavigationProp<HistoryStackParamList, "HistoryHome">;

export function HistoryScreen() {
  const navigation = useNavigation<Nav>();
  // Subscribe to history so the list re-derives when a session ends.
  const history = useWorkoutStore((s) => s.history);
  const sessions = useMemo(
    () => workoutStore.getState().getSessionsList(),
    [history]
  );

  if (sessions.length === 0) {
    return (
      <View className="flex-1 bg-page items-center justify-center p-6">
        <Icon icon={History} color="muted" size={48} />
        <Text className="text-lg text-muted mt-4">No workouts yet</Text>
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-page"
      contentContainerClassName="p-4"
      data={sessions}
      keyExtractor={(s) => s.id}
      renderItem={({ item }) => (
        <Pressable
          onPress={() =>
            navigation.navigate("SessionDetail", { sessionId: item.id })
          }
          className="bg-card border border-subtle rounded-surface p-4 mb-3"
        >
          <Text className="text-lg font-bold text-primary">
            {formatSessionDate(item.startedAt)}
          </Text>
          <Text className="text-sm text-muted mt-1">
            {item.exerciseCount}{" "}
            {item.exerciseCount === 1 ? "exercise" : "exercises"} ·{" "}
            {formatDuration(item.durationMs)}
          </Text>
        </Pressable>
      )}
    />
  );
}
