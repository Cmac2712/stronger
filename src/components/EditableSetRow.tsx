import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Check, X } from "lucide-react-native";
import { Set } from "../types";
import { NumericField } from "./NumericField";
import { Icon } from "./Icon";
import { formatNumericValue } from "../util/parseNumericInput";

type Props = {
  set: Set;
  onUpdate: (patch: { reps?: number; weight?: number }) => void;
  onDelete: () => void;
};

// A single logged set row, shared by the active session and history detail.
// Tap the row to edit (reuses the logging NumericField UI); the X icon deletes
// immediately (no confirmation — single-user app, no undo by design).
export function EditableSetRow({ set, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [reps, setReps] = useState(set.reps);
  const [weight, setWeight] = useState(set.weight);

  const startEdit = () => {
    setReps(set.reps);
    setWeight(set.weight);
    setEditing(true);
  };

  const save = () => {
    onUpdate({ reps, weight });
    setEditing(false);
  };

  if (editing) {
    return (
      <View className="bg-card-elevated rounded-surface p-3 my-1">
        <Text className="text-xs text-muted mb-2">Set {set.setNumber}</Text>
        <View className="flex-row justify-around items-end mb-3">
          <NumericField label="Reps" value={reps} onChange={setReps} />
          <NumericField
            label="Weight"
            value={weight}
            unit="kg"
            decimal
            onChange={setWeight}
          />
        </View>
        <View className="flex-row justify-end items-center">
          <Pressable
            onPress={() => setEditing(false)}
            hitSlop={8}
            className="px-3 py-2 mr-2 flex-row items-center gap-1.5"
          >
            <Icon icon={X} size={16} color="muted" />
            <Text className="text-muted font-semibold">Cancel</Text>
          </Pressable>
          <Pressable
            onPress={save}
            className="bg-primary-accent rounded-control px-4 py-2 flex-row items-center gap-1.5"
          >
            <Icon icon={Check} size={16} color="on-accent" />
            <Text className="text-on-accent font-semibold">Save</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-row items-center justify-between py-1">
      <Pressable
        onPress={startEdit}
        hitSlop={6}
        accessibilityLabel={`Edit set ${set.setNumber}`}
        className="flex-1"
      >
        <Text className="text-sm text-secondary">
          Set {set.setNumber}: {set.reps} reps × {formatNumericValue(set.weight)} kg
        </Text>
      </Pressable>
      <Pressable
        onPress={onDelete}
        hitSlop={8}
        accessibilityLabel={`Delete set ${set.setNumber}`}
        className="px-2"
      >
        <Icon icon={X} size={18} color="danger-accent-text" />
      </Pressable>
    </View>
  );
}
