import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Check, X } from "lucide-react-native";
import { Set } from "../types";
import { NumericField } from "./NumericField";
import { Icon } from "./Icon";

type Props = {
  // The committed set, or null for the open (entry) row.
  set: Set | null;
  // Number shown in the Set column; for the open row, the number the set
  // will receive when committed.
  rowNumber: number;
  // Seeds the open row's draft from the previous set (null when the exercise
  // has never been performed). Read once on mount — consumers key the open
  // row by set count so a fresh row re-seeds after each commit.
  prefill?: { reps: number; weight: number } | null;
  // Open row: commit the draft as a new set.
  onCommit?: (reps: number, weight: number) => void;
  // Logged row: edit a field in place (saves on blur) and delete.
  onUpdate?: (patch: { reps?: number; weight?: number }) => void;
  onDelete?: () => void;
};

// Column headers for a stack of SetRows. Rendered by the consumer above the
// rows; the fixed widths mirror SetRow's columns so they stay aligned.
export function SetRowHeader() {
  return (
    <View className="flex-row items-center gap-2 mb-1">
      <Text className="w-6 text-xs text-muted text-center">Set</Text>
      <Text className="flex-1 text-xs text-muted text-center">Reps</Text>
      <Text className="flex-1 text-xs text-muted text-center">kg</Text>
      <View className="w-11" />
      <View className="w-8" />
    </View>
  );
}

// The unified [reps] [weight] [✓] row, used both for entering a set and for
// displaying a logged one. With no committed set this is the open entry row:
// grey ✓, draft seeded from the previous set, committed on tap. A committed
// set shows a green ✓ and is corrected by tapping a field in place — there is
// no separate edit mode.
export function SetRow({
  set,
  rowNumber,
  prefill,
  onCommit,
  onUpdate,
  onDelete,
}: Props) {
  // Draft for the open row only; logged rows read and write the store value
  // directly through onUpdate.
  const [draftReps, setDraftReps] = useState(prefill?.reps ?? 0);
  const [draftWeight, setDraftWeight] = useState(prefill?.weight ?? 0);

  // Commit guard for the open row: an empty set is meaningless, but weight 0
  // stays valid (bodyweight movements).
  const canCommit = draftReps >= 1;

  return (
    <View className="flex-row items-center gap-2 py-1">
      <Text className="w-6 text-sm text-muted text-center">{rowNumber}</Text>
      <View className="flex-1">
        <NumericField
          accessibilityLabel={`Set ${rowNumber} reps`}
          value={set ? set.reps : draftReps}
          onChange={set ? (reps) => onUpdate?.({ reps }) : setDraftReps}
        />
      </View>
      <View className="flex-1">
        <NumericField
          accessibilityLabel={`Set ${rowNumber} weight`}
          value={set ? set.weight : draftWeight}
          decimal
          onChange={set ? (weight) => onUpdate?.({ weight }) : setDraftWeight}
        />
      </View>
      {set ? (
        <>
          <View
            className="w-11 h-11 items-center justify-center"
            accessibilityLabel={`Set ${rowNumber} logged`}
          >
            <Icon icon={Check} size={22} color="success" />
          </View>
          <Pressable
            onPress={onDelete}
            hitSlop={8}
            accessibilityLabel={`Delete set ${rowNumber}`}
            className="w-8 h-11 items-center justify-center"
          >
            <Icon icon={X} size={18} color="danger-accent-text" />
          </Pressable>
        </>
      ) : (
        <>
          <Pressable
            onPress={() => onCommit?.(draftReps, draftWeight)}
            disabled={!canCommit}
            hitSlop={4}
            accessibilityLabel={`Log set ${rowNumber}`}
            accessibilityState={{ disabled: !canCommit }}
            className="w-11 h-11 items-center justify-center"
          >
            <Icon icon={Check} size={22} color={canCommit ? "secondary" : "muted"} />
          </Pressable>
          <View className="w-8" />
        </>
      )}
    </View>
  );
}
