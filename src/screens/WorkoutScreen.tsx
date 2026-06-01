import { View, Text, Pressable, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useWorkoutStore, workoutStore } from "../store/workoutStore";
import { SessionExerciseCard } from "../components/SessionExerciseCard";
import { RestTimerBar } from "../components/RestTimerBar";
import * as syncEngine from "../sync/syncEngine";
import type { WorkoutStackParamList } from "../navigation/RootNavigator";
import { Button, ButtonText, ButtonGroup, ButtonIcon, ButtonSpinner } from "@/components/ui/button";

type Nav = NativeStackNavigationProp<WorkoutStackParamList, "WorkoutHome">;

export function WorkoutScreen() {
  const activeSession = useWorkoutStore((s) => s.activeSession);
  const navigation = useNavigation<Nav>();

  if (activeSession === null) {
    return <IdleView />;
  }

  return (
    <ScrollView
      className="flex-1 bg-page"
      contentContainerClassName="p-4"
    >
      <Text className="text-2xl font-bold text-primary mb-4">
        Active Workout
      </Text>

      <RestTimerBar />

      {activeSession.sessionExercises.length === 0 && (
        <Text className="text-sm text-muted mb-4">
          No exercises yet — tap “Add Exercise” to get started.
        </Text>
      )}

      {activeSession.sessionExercises.map((se) => (
        <SessionExerciseCard
          key={se.id}
          sessionExercise={se}
          prefill={workoutStore.getState().getLastSetFor(se.exerciseId)}
          onLogSet={(reps, weight) =>
            workoutStore.getState().logSet(se.id, reps, weight)
          }
          onRemove={() =>
            workoutStore.getState().removeExerciseFromSession(se.id)
          }
          onOpenHistory={() =>
            navigation.navigate("ExerciseHistory", { exerciseId: se.exerciseId })
          }
          onUpdateSet={(setId, patch) =>
            workoutStore.getState().updateSet(setId, patch)
          }
          onDeleteSet={(setId) => workoutStore.getState().deleteSet(setId)}
        />
      ))}

      <Pressable
        onPress={() => navigation.navigate("ExercisePicker")}
        className="bg-primary-accent rounded-control py-4 items-center mt-2"
      >
        <Text className="text-on-accent font-bold text-base">Add Exercise</Text>
      </Pressable>

      <Pressable
        onPress={() => workoutStore.getState().endSession()}
        className="bg-danger rounded-control py-4 items-center mt-3"
      >
        <Text className="text-on-accent font-bold text-base">End Workout</Text>
      </Pressable>

      <SignOutButton />
    </ScrollView>
  );
}

function SignOutButton() {
  return (
    <Pressable
      onPress={() => void syncEngine.signOut()}
      className="py-4 items-center mt-3"
    >
      <Text className="text-muted font-medium text-sm">Sign Out</Text>
    </Pressable>
  );
}

function IdleView() {
  const onStart = () => {
    // A freshly started session is empty; the user picks exercises via the
    // Add Exercise modal.
    workoutStore.getState().startSession();
  };

  return (
    <View className="flex-1 bg-page items-center justify-center p-6">
      <Pressable
        onPress={onStart}
        className="bg-primary-accent rounded-surface px-10 py-6"
      >
        <Text className="text-on-accent font-bold text-xl">Start Workout</Text>
      </Pressable>

      <SignOutButton />
    </View>
  );
}
