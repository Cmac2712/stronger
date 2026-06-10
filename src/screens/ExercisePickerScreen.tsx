import { useMemo } from "react";
import { SectionList, Text, Pressable, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SearchX } from "lucide-react-native";
import { getAll, MUSCLE_GROUPS, Exercise, MuscleGroup } from "../data/exerciseLibrary";
import { workoutStore } from "../store/workoutStore";
import type { WorkoutStackParamList } from "../navigation/RootNavigator";
import { Icon } from "@shared/ui/Icon";

type Nav = NativeStackNavigationProp<WorkoutStackParamList, "ExercisePicker">;

type Section = { title: MuscleGroup; data: Exercise[] };

const GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: "Chest",
  back: "Back",
  legs: "Legs",
  shoulders: "Shoulders",
  arms: "Arms",
  core: "Core",
};

function buildSections(): Section[] {
  const all = getAll();
  return MUSCLE_GROUPS.map((group) => ({
    title: group,
    data: all.filter((e) => e.muscleGroup === group),
  })).filter((section) => section.data.length > 0);
}

export function ExercisePickerScreen() {
  const navigation = useNavigation<Nav>();
  const sections = useMemo(buildSections, []);

  const pick = (exerciseId: string) => {
    workoutStore.getState().addExerciseToSession(exerciseId);
    navigation.goBack();
  };

  return (
    <SectionList
      className="flex-1 bg-page"
      sections={sections}
      keyExtractor={(item) => item.id}
      stickySectionHeadersEnabled
      renderSectionHeader={({ section }) => (
        <Text className="px-4 py-2 bg-card-elevated text-xs font-bold uppercase text-muted">
          {GROUP_LABELS[section.title]}
        </Text>
      )}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => pick(item.id)}
          className="px-4 py-4 bg-card border-b border-subtle"
        >
          <Text className="text-base text-primary">{item.name}</Text>
        </Pressable>
      )}
      ListEmptyComponent={
        <View className="p-6 items-center">
          <Icon icon={SearchX} color="muted" size={40} />
          <Text className="text-muted mt-3">No exercises</Text>
        </View>
      }
    />
  );
}
