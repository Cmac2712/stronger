import { View, Text, Pressable, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useWorkoutStore, workoutStore } from "../store/workoutStore";
import { SessionExerciseCard } from "../components/SessionExerciseCard";
import type { WorkoutStackParamList } from "../navigation/RootNavigator";

type Nav = NativeStackNavigationProp<WorkoutStackParamList, "WorkoutHome">;

export function WorkoutScreen() {
  const activeSession = useWorkoutStore((s) => s.activeSession);
  const navigation = useNavigation<Nav>();

  if (activeSession === null) {
    return <IdleView />;
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-100"
      contentContainerClassName="p-4"
    >
      <Text className="text-2xl font-bold text-gray-900 mb-4">
        Active Workout
      </Text>

      {activeSession.sessionExercises.length === 0 && (
        <Text className="text-sm text-gray-400 mb-4">
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
        />
      ))}

      <Pressable
        onPress={() => navigation.navigate("ExercisePicker")}
        className="bg-blue-600 rounded-xl py-4 items-center mt-2"
      >
        <Text className="text-white font-bold text-base">Add Exercise</Text>
      </Pressable>

      <Pressable
        onPress={() => workoutStore.getState().endSession()}
        className="bg-red-600 rounded-xl py-4 items-center mt-3"
      >
        <Text className="text-white font-bold text-base">End Workout</Text>
      </Pressable>
    </ScrollView>
  );
}

function IdleView() {
  const onStart = () => {
    // A freshly started session is empty; the user picks exercises via the
    // Add Exercise modal.
    workoutStore.getState().startSession();
  };

  return (
    <View className="flex-1 bg-gray-100 items-center justify-center p-6">
      <Pressable
        onPress={onStart}
        className="bg-blue-600 rounded-2xl px-10 py-6"
      >
        <Text className="text-white font-bold text-xl">Start Workout</Text>
      </Pressable>
    </View>
  );
}
