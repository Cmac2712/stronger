import { useState, useSyncExternalStore } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { Plus, Square, LogOut, Dumbbell, Sparkles, Trash2 } from "lucide-react-native";
import {
  useWorkoutStore,
  workoutStore,
  type TemplateWithSource,
} from "@state/workoutStore";
import { colors, radius } from "@shared/theme";
import { SessionExerciseCard } from "./SessionExerciseCard";
import { RestTimerBar } from "./RestTimerBar";
import { Icon } from "@shared/ui/Icon";
import * as syncEngine from "@sync/syncEngine";
import * as connectivity from "@sync/connectivity";
import { AiSplitPicker } from "@features/templates/AiSplitPicker";
import {
  startAiWorkout,
  AiWorkoutError,
  GENERATION_FAILED_MESSAGE,
} from "@features/templates/aiWorkout";
import type { Split } from "@features/templates/templateLibrary";
import type { WorkoutStackParamList } from "../../app/RootNavigator";

type Nav = NativeStackNavigationProp<WorkoutStackParamList, "WorkoutHome">;

export function WorkoutScreen() {
  const activeSession = useWorkoutStore((s) => s.activeSession);
  const navigation = useNavigation<Nav>();

  if (activeSession === null) {
    return <IdleView />;
  }

  const onEndWorkout = () => {
    // A session with logged sets earns a summary; an empty one ends straight
    // back to idle. Decided before endSession() clears the active session.
    const hasLoggedSets = activeSession.sessionExercises.some(
      (se) => se.sets.length > 0
    );
    workoutStore.getState().endSession();
    if (hasLoggedSets) {
      navigation.navigate("WorkoutComplete", { sessionId: activeSession.id });
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-page"
      contentContainerClassName="p-4"
    >
      <Text className="text-2xl font-bold text-primary mb-4">
        Active Workout
      </Text>

      <RestTimerBar />

      {/* Intentionally icon-only: the empty state carries no instructional copy. */}
      {activeSession.sessionExercises.length === 0 && (
        <View className="items-center py-10">
          <Icon icon={Dumbbell} color="muted" size={48} />
        </View>
      )}

      {activeSession.sessionExercises.map((se) => (
        <SessionExerciseCard
          key={se.id}
          sessionExercise={se}
          prefill={workoutStore.getState().getPrefillFor(se.id)}
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
        className="bg-primary-accent rounded-control py-4 flex-row items-center justify-center gap-2 mt-2"
      >
        <Icon icon={Plus} size={18} color="on-accent" />
        <Text className="text-on-accent font-bold text-base">Add Exercise</Text>
      </Pressable>

      <Pressable
        testID="end-workout"
        onPress={onEndWorkout}
        className="bg-success rounded-control py-4 flex-row items-center justify-center gap-2 mt-3"
      >
        <Icon icon={Square} size={18} color="on-accent" />
        <Text className="text-on-accent font-bold text-base">Complete Workout</Text>
      </Pressable>

      <SignOutButton />
    </ScrollView>
  );
}

function SignOutButton() {
  return (
    <Pressable
      onPress={() => void syncEngine.signOut()}
      className="py-4 flex-row items-center justify-center gap-2 mt-3"
    >
      <Icon icon={LogOut} size={16} color="muted" />
      <Text className="text-muted font-medium text-sm">Sign Out</Text>
    </Pressable>
  );
}

// The launch screen: every way to begin a session lives here. Builtin
// template rows are read-only — no delete affordance by design; user rows
// delete by the app-wide swipe-left gesture.
function IdleView() {
  // Subscribing to the raw user-template array re-renders the list on
  // save/delete; the merged, library-vetted view still comes from
  // getTemplates().
  useWorkoutStore((s) => s.templates);
  const templates = workoutStore.getState().getTemplates();
  const builtinTemplates = templates.filter((t) => t.source === "builtin");
  const userTemplates = templates.filter((t) => t.source === "user");

  // The AI workout is the app's only network-required feature; it gates on
  // the device connectivity signal (see @sync/connectivity for why the
  // sync-status "paused" listener is the wrong gate).
  const online = useSyncExternalStore(
    connectivity.onConnectivityChange,
    connectivity.isOnline
  );
  const [pickerVisible, setPickerVisible] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const aiDisabled = !online || generating;

  const onStart = () => {
    // A freshly started session is empty; the user picks exercises via the
    // Add Exercise modal.
    workoutStore.getState().startSession();
  };

  const onSelectSplit = async (split: Split) => {
    setPickerVisible(false);
    setGenerating(true);
    setAiError(null);
    try {
      // On success applyTemplate starts the session, activeSession becomes
      // non-null, and WorkoutScreen re-renders straight into the active view
      // — generate-and-go, no confirmation step.
      await startAiWorkout(split);
    } catch (error) {
      setAiError(
        error instanceof AiWorkoutError
          ? error.message
          : GENERATION_FAILED_MESSAGE
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-page" contentContainerClassName="p-6">
      <Pressable
        testID="start-workout"
        onPress={onStart}
        className="bg-primary-accent rounded-surface py-6 items-center"
      >
        <Text className="text-on-accent font-bold text-xl">Start Workout</Text>
      </Pressable>

      <Pressable
        testID="ai-workout"
        disabled={aiDisabled}
        onPress={() => {
          setAiError(null);
          setPickerVisible(true);
        }}
        className={`bg-card border border-subtle rounded-surface py-6 mt-3 flex-row items-center justify-center gap-2 ${
          aiDisabled ? "opacity-50" : ""
        }`}
      >
        <Icon icon={Sparkles} size={20} color="primary" />
        <Text className="text-primary font-bold text-xl">
          {generating ? "Generating…" : "AI Workout"}
        </Text>
      </Pressable>
      {!online && (
        <Text
          testID="ai-workout-offline-hint"
          className="text-sm text-muted mt-2"
        >
          You're offline — AI workout needs an internet connection.
        </Text>
      )}
      {aiError !== null && (
        <Text
          testID="ai-workout-error"
          className="text-danger-accent-text text-sm mt-2"
        >
          {aiError}
        </Text>
      )}

      <AiSplitPicker
        visible={pickerVisible}
        onSelect={(split) => void onSelectSplit(split)}
        onCancel={() => setPickerVisible(false)}
      />

      <Text className="text-sm font-medium text-muted uppercase mt-8 mb-3">
        Builtin
      </Text>
      {builtinTemplates.map((t) => (
        <TemplateRow key={t.id} template={t} testID={`template-${t.id}`} />
      ))}

      {/* The header only appears once there is something of yours to list. */}
      {userTemplates.length > 0 && (
        <Text className="text-sm font-medium text-muted uppercase mt-5 mb-3">
          Yours
        </Text>
      )}
      {userTemplates.map((t, index) => (
        // Indexed testID: user-template ids are generated, so flows address
        // rows by list position instead.
        <TemplateRow key={t.id} template={t} testID={`template-user-${index}`} />
      ))}

      <SignOutButton />
    </ScrollView>
  );
}

// One launch-screen template row: tap applies (start-only). User rows swipe
// left to delete — immediate, no confirmation, the same gesture and contract
// as SetRow; builtin rows are not swipeable at all.
function TemplateRow({
  template,
  testID,
}: {
  template: TemplateWithSource;
  testID: string;
}) {
  const row = (
    <Pressable
      testID={testID}
      onPress={() =>
        workoutStore.getState().applyTemplate(template.exerciseIds)
      }
      className="bg-card border border-subtle rounded-surface p-4"
    >
      <Text className="text-lg font-bold text-primary">{template.name}</Text>
      <Text className="text-sm text-muted mt-1">
        {template.exerciseIds.length}{" "}
        {template.exerciseIds.length === 1 ? "exercise" : "exercises"}
      </Text>
    </Pressable>
  );

  if (template.source === "builtin") {
    return <View className="mb-3">{row}</View>;
  }

  return (
    <ReanimatedSwipeable
      containerStyle={{ marginBottom: 12 }}
      renderRightActions={() => (
        <View
          className="w-16 bg-danger rounded-surface items-center justify-center"
          accessibilityLabel={`Delete template ${template.name}`}
        >
          <Icon icon={Trash2} size={20} color="on-accent" />
        </View>
      )}
      // Opening the panel IS the delete — no confirmation, no undo.
      onSwipeableOpen={() =>
        workoutStore.getState().deleteTemplate(template.id)
      }
      overshootRight={false}
      friction={2}
      rightThreshold={40}
      // The row's rounded corners are transparent; a page-coloured backing
      // stops the danger panel showing through them while the row slides.
      childrenContainerStyle={{
        backgroundColor: colors.page,
        borderRadius: radius.surface,
      }}
    >
      {row}
    </ReanimatedSwipeable>
  );
}
