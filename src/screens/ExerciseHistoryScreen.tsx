import { useMemo } from "react";
import { ScrollView, View, Text, Dimensions } from "react-native";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { useWorkoutStore, workoutStore } from "../store/workoutStore";
import { getById } from "../data/exerciseLibrary";
import type { WorkoutStackParamList } from "../navigation/RootNavigator";
import { formatSessionDate } from "@shared/lib/format";
import { Sparkline } from "../components/Sparkline";

// ExerciseHistory lives in both the Workout and History stacks with the same
// params; either route type works for reading exerciseId.
type ExerciseHistoryRoute = RouteProp<WorkoutStackParamList, "ExerciseHistory">;

const SPARK_HEIGHT = 80;

export function ExerciseHistoryScreen() {
  const { params } = useRoute<ExerciseHistoryRoute>();
  const exerciseId = params.exerciseId;

  // Re-derive when either store slice changes (history is included; so is the
  // active session, which getHistoryFor folds in).
  const history = useWorkoutStore((s) => s.history);
  const activeSession = useWorkoutStore((s) => s.activeSession);
  const { sessions, topSetWeights } = useMemo(
    () => workoutStore.getState().getHistoryFor(exerciseId),
    [exerciseId, history, activeSession]
  );

  const exercise = getById(exerciseId);
  const name = exercise?.name ?? exerciseId;
  const sparkWidth = Dimensions.get("window").width - 32;

  return (
    <ScrollView className="flex-1 bg-page" contentContainerClassName="p-4">
      <Text className="text-2xl font-bold text-primary">{name}</Text>
      {exercise && (
        <Text className="text-sm text-muted capitalize mb-4">
          {exercise.muscleGroup}
        </Text>
      )}

      {topSetWeights.length === 0 ? (
        <Text className="text-base text-muted mb-4">No sets logged yet</Text>
      ) : (
        <View className="bg-card border border-subtle rounded-surface p-4 mb-4">
          <Text className="text-xs font-semibold text-muted mb-2">
            Top-set weight (last {topSetWeights.length})
          </Text>
          <Sparkline
            values={topSetWeights}
            width={sparkWidth}
            height={SPARK_HEIGHT}
          />
        </View>
      )}

      {sessions.map((session) => (
        <View key={session.id} className="bg-card border border-subtle rounded-surface p-4 mb-3">
          <Text className="text-base font-bold text-primary mb-2">
            {formatSessionDate(session.startedAt)}
          </Text>
          {session.sets.map((set, i) => (
            <Text key={i} className="text-sm text-secondary py-0.5">
              Set {set.setNumber}: {set.reps} reps × {set.weight} kg
            </Text>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}
