import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { SessionExercise } from "../types";
import { getById } from "../data/exerciseLibrary";
import { NumericField } from "./NumericField";
import { EditableSetRow } from "./EditableSetRow";

type Props = {
  sessionExercise: SessionExercise;
  // Most recent set for this exercise (from getLastSetFor), or null if never
  // performed. Seeds the next-set steppers so confirming an unchanged set is
  // one tap.
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
  const [reps, setReps] = useState(prefill?.reps ?? 0);
  const [weight, setWeight] = useState(prefill?.weight ?? 0);

  // Commit guard: an empty set is meaningless, but weight 0 stays valid
  // (bodyweight movements).
  const canLog = reps >= 1;

  const name =
    getById(sessionExercise.exerciseId)?.name ?? sessionExercise.exerciseId;

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

      {sessionExercise.sets.length === 0 ? (
        <Text className="text-sm text-muted mb-3">No sets logged yet</Text>
      ) : (
        <View className="mb-3">
          {sessionExercise.sets.map((set) => (
            <EditableSetRow
              key={set.id}
              set={set}
              onUpdate={(patch) => onUpdateSet(set.id, patch)}
              onDelete={() => onDeleteSet(set.id)}
            />
          ))}
        </View>
      )}

      <View className="flex-row justify-around items-end mb-3">
        <NumericField label="Reps" value={reps} min={0} onChange={setReps} />
        <NumericField
          label="Weight"
          value={weight}
          min={0}
          unit="kg"
          decimal
          onChange={setWeight}
        />
      </View>

      <Pressable
        onPress={() => onLogSet(reps, weight)}
        disabled={!canLog}
        accessibilityState={{ disabled: !canLog }}
        className={`rounded-control py-3 items-center ${
          canLog ? "bg-primary-accent" : "bg-card-elevated"
        }`}
      >
        <Text
          className={`font-semibold ${canLog ? "text-on-accent" : "text-muted"}`}
        >
          Log Set
        </Text>
      </Pressable>
    </View>
  );
}
