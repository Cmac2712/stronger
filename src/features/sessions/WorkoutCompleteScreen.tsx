import { ScrollView, View, Text, Pressable } from "react-native";
import {
  useRoute,
  useNavigation,
  type RouteProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useWorkoutStore } from "@state/workoutStore";
import { getById } from "@features/exercises/exerciseLibrary";
import { formatDuration } from "@shared/lib/format";
import type { WorkoutStackParamList } from "../../app/RootNavigator";
import { summarizeSession } from "./sessionSummary";

type CompleteRoute = RouteProp<WorkoutStackParamList, "WorkoutComplete">;
type Nav = NativeStackNavigationProp<WorkoutStackParamList, "WorkoutComplete">;

// Shown after ending a session with ≥1 logged set (WorkoutScreen skips it for
// empty sessions). The ended session has already moved to history, so it is
// read back by id.
export function WorkoutCompleteScreen() {
  const { params } = useRoute<CompleteRoute>();
  const navigation = useNavigation<Nav>();
  const session = useWorkoutStore((s) =>
    s.history.find((x) => x.id === params.sessionId)
  );

  // Back to WorkoutHome, which renders idle because endSession() already
  // cleared the active session.
  const done = () => navigation.popToTop();

  if (!session) {
    return (
      <View className="flex-1 bg-page items-center justify-center p-6">
        <Text className="text-lg text-muted">Session not found</Text>
        <DoneButton onPress={done} />
      </View>
    );
  }

  const summary = summarizeSession(session);

  return (
    <ScrollView
      testID="workout-complete-screen"
      className="flex-1 bg-page"
      contentContainerClassName="p-4"
    >
      <Text className="text-2xl font-bold text-primary mb-4">
        Workout Complete
      </Text>

      <View className="bg-card border border-subtle rounded-surface p-4 mb-4 flex-row">
        <View className="flex-1">
          <Text className="text-xs font-semibold text-muted mb-1">
            Duration
          </Text>
          <Text className="text-xl font-bold text-primary">
            {formatDuration(summary.durationMs)}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-xs font-semibold text-muted mb-1">
            Total sets
          </Text>
          <Text className="text-xl font-bold text-primary">
            {summary.totalSets}
          </Text>
        </View>
      </View>

      {summary.exercises.map((e) => {
        const name = getById(e.exerciseId)?.name ?? e.exerciseId;
        return (
          <View
            key={e.exerciseId}
            className="bg-card border border-subtle rounded-surface p-4 mb-3"
          >
            <Text className="text-lg font-bold text-primary-accent-text mb-1">
              {name}
            </Text>
            <Text className="text-sm text-secondary">
              {e.setCount} {e.setCount === 1 ? "set" : "sets"} · Top set:{" "}
              {e.topSet.reps} × {e.topSet.weight} kg
            </Text>
          </View>
        );
      })}

      {/* Action area. "Save as template" lands here as the primary action in
          a later slice; Done then becomes the secondary exit. */}
      <DoneButton onPress={done} />
    </ScrollView>
  );
}

function DoneButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      testID="workout-complete-done"
      onPress={onPress}
      className="bg-primary-accent rounded-control py-4 items-center mt-2"
    >
      <Text className="text-on-accent font-bold text-base">Done</Text>
    </Pressable>
  );
}
