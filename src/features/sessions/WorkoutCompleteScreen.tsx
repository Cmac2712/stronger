import { useState } from "react";
import { ScrollView, View, Text, Pressable, Modal, TextInput } from "react-native";
import {
  useRoute,
  useNavigation,
  type RouteProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useWorkoutStore, workoutStore } from "@state/workoutStore";
import { getById } from "@features/exercises/exerciseLibrary";
import { templateFromSession } from "@features/templates/templateFromSession";
import { formatDuration } from "@shared/lib/format";
import { colors } from "@shared/theme";
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
  const [promptVisible, setPromptVisible] = useState(false);
  // The name the template was saved under, or null while unsaved. Saving is
  // one-shot per visit: the action collapses into a confirmation.
  const [savedName, setSavedName] = useState<string | null>(null);

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
  // Distinct exercises with ≥1 logged set, first-appearance order, plus the
  // dominant-muscle-group default name. The screen is only reached for
  // non-empty sessions, so exerciseIds is never empty.
  const derivedTemplate = templateFromSession(session);

  const onSaveTemplate = (name: string) => {
    workoutStore.getState().saveTemplate({
      name,
      exerciseIds: derivedTemplate.exerciseIds,
    });
    setPromptVisible(false);
    setSavedName(name);
  };

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

      {/* Saving is optional and one-shot: the primary action becomes a
          confirmation once used, so a session can't be saved twice from here. */}
      {savedName === null ? (
        <Pressable
          testID="save-as-template"
          onPress={() => setPromptVisible(true)}
          className="bg-primary-accent rounded-control py-4 items-center mt-2"
        >
          <Text className="text-on-accent font-bold text-base">
            Save as template
          </Text>
        </Pressable>
      ) : (
        <View
          testID="template-saved-confirmation"
          className="bg-card border border-subtle rounded-control py-4 items-center mt-2"
        >
          <Text className="text-secondary font-medium text-base">
            Saved to your templates as “{savedName}”
          </Text>
        </View>
      )}
      <DoneButton onPress={done} />

      <TemplateNamePrompt
        visible={promptVisible}
        defaultName={derivedTemplate.name}
        onSave={onSaveTemplate}
        onCancel={() => setPromptVisible(false)}
      />
    </ScrollView>
  );
}

// Name prompt for Save as template, pre-filled with the derived default so
// accepting the suggestion is a single tap (US #10).
function TemplateNamePrompt({
  visible,
  defaultName,
  onSave,
  onCancel,
}: {
  visible: boolean;
  defaultName: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(defaultName);
  const trimmed = name.trim();
  const saveDisabled = trimmed === "";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View className="flex-1 bg-black/60 justify-center p-6">
        <View
          testID="template-name-prompt"
          className="bg-card border border-subtle rounded-surface p-5"
        >
          <Text className="text-xl font-bold text-primary mb-1">
            Save as template
          </Text>
          <Text className="text-sm text-muted mb-4">
            Name this template
          </Text>
          <TextInput
            testID="template-name-input"
            value={name}
            onChangeText={setName}
            selectTextOnFocus
            placeholder={defaultName}
            placeholderTextColor={colors.muted}
            className="bg-page border border-subtle rounded-control py-3 px-4 text-base text-primary mb-4"
          />
          <Pressable
            testID="template-name-save"
            disabled={saveDisabled}
            onPress={() => onSave(trimmed)}
            className={`bg-primary-accent rounded-control py-3 items-center ${
              saveDisabled ? "opacity-50" : ""
            }`}
          >
            <Text className="text-on-accent font-bold text-base">Save</Text>
          </Pressable>
          <Pressable
            testID="template-name-cancel"
            onPress={onCancel}
            className="py-3 items-center"
          >
            <Text className="text-muted font-medium">Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
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
