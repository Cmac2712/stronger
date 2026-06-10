import { View, Text, Pressable } from "react-native";
import { SessionExercise } from "@shared/types";
import { getById } from "@features/exercises/exerciseLibrary";
import { nextSetNumber } from "@state/workoutStore";
import { SetRow, SetRowHeader } from "./SetRow";

type Props = {
  sessionExercise: SessionExercise;
  // Reps/weight seeding the open row (from getPrefillFor), so confirming an
  // unchanged set is one tap.
  prefill: { reps: number; weight: number } | null;
  onLogSet: (reps: number, weight: number) => void;
  onRemove: () => void;
  onOpenHistory: () => void;
  onUpdateSet: (setId: string, patch: { reps?: number; weight?: number }) => void;
  onDeleteSet: (setId: string) => void;
};

export function SessionExerciseCard({
  sessionExercise,
  prefill,
  onLogSet,
  onRemove,
  onOpenHistory,
  onUpdateSet,
  onDeleteSet,
}: Props) {
  const name =
    getById(sessionExercise.exerciseId)?.name ?? sessionExercise.exerciseId;
  const sets = sessionExercise.sets;

  return (
    <View className="bg-card border border-subtle rounded-surface p-4 mb-4">
      <View className="flex-row items-center justify-between mb-2">
        <Pressable
          onPress={onOpenHistory}
          hitSlop={6}
          accessibilityLabel={`View ${name} history`}
          className="flex-1 pr-2"
        >
          <Text className="text-lg font-bold text-primary-accent-text">{name}</Text>
        </Pressable>
        <Pressable
          onPress={onRemove}
          accessibilityLabel={`Remove ${name}`}
          hitSlop={8}
          className="px-2 py-1"
        >
          <Text className="text-sm font-semibold text-danger-accent-text">Remove</Text>
        </Pressable>
      </View>

      <SetRowHeader />

      {sets.map((set) => (
        <SetRow
          key={set.id}
          set={set}
          rowNumber={set.setNumber}
          onUpdate={(patch) => onUpdateSet(set.id, patch)}
          onDelete={() => onDeleteSet(set.id)}
        />
      ))}

      {/* Keyed by set count so each commit remounts a fresh open row whose
          draft re-seeds from the now-updated prefill (the set just logged). */}
      <SetRow
        key={`open-${sets.length}`}
        set={null}
        rowNumber={nextSetNumber(sets)}
        prefill={prefill}
        onCommit={onLogSet}
      />
    </View>
  );
}
