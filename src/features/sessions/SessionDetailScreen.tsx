import { ScrollView, View, Text, Pressable } from "react-native";
import {
  useRoute,
  useNavigation,
  type RouteProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  useWorkoutStore,
  workoutStore,
  nextSetNumber,
} from "@state/workoutStore";
import { getById } from "@features/exercises/exerciseLibrary";
import type { HistoryStackParamList } from "../../app/RootNavigator";
import { formatSessionDate, formatDuration } from "@shared/lib/format";
import { SetRow, SetRowHeader } from "./SetRow";

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
            {/* The open row makes a finished workout amendable: committing
                appends a set to this historical session (no rest timer, no
                startedAt/endedAt change). Keyed by set count so each commit
                remounts a fresh row re-seeded from the set just added. */}
            <SetRow
              key={`open-${se.sets.length}`}
              set={null}
              rowNumber={nextSetNumber(se.sets)}
              prefill={workoutStore.getState().getPrefillFor(se.id)}
              onCommit={(reps, weight) =>
                workoutStore.getState().logSet(se.id, reps, weight)
              }
            />
          </View>
        );
      })}
    </ScrollView>
  );
}
