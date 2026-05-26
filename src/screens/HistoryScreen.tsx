import { useMemo } from "react";
import { FlatList, View, Text, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useWorkoutStore, workoutStore } from "../store/workoutStore";
import type { HistoryStackParamList } from "../navigation/RootNavigator";
import { formatSessionDate, formatDuration } from "../util/format";

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
      <View className="flex-1 bg-gray-100 items-center justify-center p-6">
        <Text className="text-lg text-gray-500">No workouts yet</Text>
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-gray-100"
      contentContainerClassName="p-4"
      data={sessions}
      keyExtractor={(s) => s.id}
      renderItem={({ item }) => (
        <Pressable
          onPress={() =>
            navigation.navigate("SessionDetail", { sessionId: item.id })
          }
          className="bg-white rounded-2xl p-4 mb-3 shadow-sm"
        >
          <Text className="text-lg font-bold text-gray-900">
            {formatSessionDate(item.startedAt)}
          </Text>
          <Text className="text-sm text-gray-500 mt-1">
            {item.exerciseCount}{" "}
            {item.exerciseCount === 1 ? "exercise" : "exercises"} ·{" "}
            {formatDuration(item.durationMs)}
          </Text>
        </Pressable>
      )}
    />
  );
}
