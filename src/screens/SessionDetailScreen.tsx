import { ScrollView, View, Text, Pressable } from "react-native";
import {
  useRoute,
  useNavigation,
  type RouteProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useWorkoutStore, workoutStore } from "../store/workoutStore";
import { getById } from "../data/exerciseLibrary";
import type { HistoryStackParamList } from "../navigation/RootNavigator";
import { formatSessionDate, formatDuration } from "../util/format";
import { SetRow, SetRowHeader } from "../components/SetRow";

type DetailRoute = RouteProp<HistoryStackParamList, "SessionDetail">;
type Nav = NativeStackNavigationProp<HistoryStackParamList, "SessionDetail">;

export function SessionDetailScreen() {
  const { params } = useRoute<DetailRoute>();
  const navigation = useNavigation<Nav>();
  const session = useWorkoutStore((s) =>
    s.history.find((x) => x.id === params.sessionId)
  );

  if (!session) {
    return (
      <View className="flex-1 bg-page items-center justify-center p-6">
        <Text className="text-lg text-muted">Session not found</Text>
      </View>
    );
  }

  const durationMs = (session.endedAt ?? session.startedAt) - session.startedAt;
  const exercises = [...session.sessionExercises].sort(
    (a, b) => a.order - b.order
  );

  return (
    <ScrollView className="flex-1 bg-page" contentContainerClassName="p-4">
      <Text className="text-2xl font-bold text-primary">
        {formatSessionDate(session.startedAt)}
      </Text>
      <Text className="text-sm text-muted mb-4">
        {formatDuration(durationMs)}
      </Text>

      {exercises.map((se) => {
        const name = getById(se.exerciseId)?.name ?? se.exerciseId;
        return (
          <View key={se.id} className="bg-card border border-subtle rounded-surface p-4 mb-3">
            <Pressable
              onPress={() =>
                navigation.navigate("ExerciseHistory", {
                  exerciseId: se.exerciseId,
                })
              }
              hitSlop={6}
              accessibilityLabel={`View ${name} history`}
            >
              <Text className="text-lg font-bold text-primary-accent-text mb-2">{name}</Text>
            </Pressable>
            {se.sets.length === 0 ? (
              <Text className="text-sm text-muted">No sets logged</Text>
            ) : (
              <>
                <SetRowHeader />
                {se.sets.map((set) => (
                  <SetRow
                    key={set.id}
                    set={set}
                    rowNumber={set.setNumber}
                    onUpdate={(patch) =>
                      workoutStore.getState().updateSet(set.id, patch)
                    }
                    onDelete={() => workoutStore.getState().deleteSet(set.id)}
                  />
                ))}
              </>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}
