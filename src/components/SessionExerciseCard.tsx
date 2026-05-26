import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { SessionExercise } from "../types";
import { getById } from "../data/exerciseLibrary";
import { Stepper } from "./Stepper";

type Props = {
  sessionExercise: SessionExercise;
  // Most recent set for this exercise (from getLastSetFor), or null if never
  // performed. Seeds the next-set steppers so confirming an unchanged set is
  // one tap.
  prefill: { reps: number; weight: number } | null;
  onLogSet: (reps: number, weight: number) => void;
  onRemove: () => void;
};

const REP_STEP = 1;
const WEIGHT_STEP = 2.5;

export function SessionExerciseCard({
  sessionExercise,
  prefill,
  onLogSet,
  onRemove,
}: Props) {
  const [reps, setReps] = useState(prefill?.reps ?? 0);
  const [weight, setWeight] = useState(prefill?.weight ?? 0);

  const name =
    getById(sessionExercise.exerciseId)?.name ?? sessionExercise.exerciseId;

  return (
    <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-lg font-bold text-gray-900 flex-1 pr-2">{name}</Text>
        <Pressable
          onPress={onRemove}
          accessibilityLabel={`Remove ${name}`}
          hitSlop={8}
          className="px-2 py-1"
        >
          <Text className="text-sm font-semibold text-red-600">Remove</Text>
        </Pressable>
      </View>

      {sessionExercise.sets.length === 0 ? (
        <Text className="text-sm text-gray-400 mb-3">No sets logged yet</Text>
      ) : (
        <View className="mb-3">
          {sessionExercise.sets.map((set) => (
            <Text key={set.id} className="text-sm text-gray-700">
              Set {set.setNumber}: {set.reps} reps × {set.weight} kg
            </Text>
          ))}
        </View>
      )}

      <View className="flex-row justify-around items-end mb-3">
        <Stepper label="Reps" value={reps} step={REP_STEP} min={0} onChange={setReps} />
        <Stepper
          label="Weight"
          value={weight}
          step={WEIGHT_STEP}
          min={0}
          unit="kg"
          onChange={setWeight}
        />
      </View>

      <Pressable
        onPress={() => onLogSet(reps, weight)}
        className="bg-blue-600 rounded-xl py-3 items-center"
      >
        <Text className="text-white font-semibold">Log Set</Text>
      </Pressable>
    </View>
  );
}
