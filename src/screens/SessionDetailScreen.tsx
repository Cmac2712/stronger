import { ScrollView, View, Text } from "react-native";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { useWorkoutStore } from "../store/workoutStore";
import { getById } from "../data/exerciseLibrary";
import type { HistoryStackParamList } from "../navigation/RootNavigator";
import { formatSessionDate, formatDuration } from "../util/format";

type DetailRoute = RouteProp<HistoryStackParamList, "SessionDetail">;

export function SessionDetailScreen() {
  const { params } = useRoute<DetailRoute>();
  const session = useWorkoutStore((s) =>
    s.history.find((x) => x.id === params.sessionId)
  );

  if (!session) {
    return (
      <View className="flex-1 bg-gray-100 items-center justify-center p-6">
        <Text className="text-lg text-gray-500">Session not found</Text>
      </View>
    );
  }

  const durationMs = (session.endedAt ?? session.startedAt) - session.startedAt;
  const exercises = [...session.sessionExercises].sort(
    (a, b) => a.order - b.order
  );

  return (
    <ScrollView className="flex-1 bg-gray-100" contentContainerClassName="p-4">
      <Text className="text-2xl font-bold text-gray-900">
        {formatSessionDate(session.startedAt)}
      </Text>
      <Text className="text-sm text-gray-500 mb-4">
        {formatDuration(durationMs)}
      </Text>

      {exercises.map((se) => {
        const name = getById(se.exerciseId)?.name ?? se.exerciseId;
        return (
          <View key={se.id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
            <Text className="text-lg font-bold text-gray-900 mb-2">{name}</Text>
            {se.sets.length === 0 ? (
              <Text className="text-sm text-gray-400">No sets logged</Text>
            ) : (
              se.sets.map((set) => (
                <Text key={set.id} className="text-sm text-gray-700">
                  Set {set.setNumber}: {set.reps} reps × {set.weight} kg
                </Text>
              ))
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}
