import { useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import { parseNumericInput } from "../util/parseNumericInput";

type Props = {
  label: string;
  value: number;
  step: number;
  min?: number;
  unit?: string;
  // Reps are integer-only (number-pad); weight allows arbitrary decimals
  // (decimal-pad), not constrained to the 2.5 kg step.
  decimal?: boolean;
  onChange: (value: number) => void;
};

export function Stepper({
  label,
  value,
  step,
  min = 0,
  unit,
  decimal = false,
  onChange,
}: Props) {
  // null = not editing: display the formatted prop value. A string = the
  // in-progress keyboard draft.
  const [draft, setDraft] = useState<string | null>(null);

  const dec = () => onChange(Math.max(min, round(value - step)));
  const inc = () => onChange(round(value + step));

  const commit = () => {
    if (draft === null) return;
    const parsed = parseNumericInput(draft, { decimal });
    // Invalid/empty input is not a confirmation: keep the prior value.
    if (parsed !== null) onChange(Math.max(min, parsed));
    setDraft(null);
  };

  return (
    <View className="items-center">
      <Text className="text-xs text-gray-500 mb-1">{label}</Text>
      <View className="flex-row items-center">
        <Pressable
          onPress={dec}
          accessibilityLabel={`Decrease ${label}`}
          className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center"
        >
          <Text className="text-xl font-bold text-gray-800">−</Text>
        </Pressable>
        <TextInput
          value={draft ?? formatValue(value)}
          onChangeText={setDraft}
          onFocus={() => setDraft(formatValue(value))}
          onEndEditing={commit}
          onSubmitEditing={commit}
          keyboardType={decimal ? "decimal-pad" : "number-pad"}
          selectTextOnFocus
          accessibilityLabel={`${label} value, tap to type`}
          className="mx-3 text-lg font-semibold text-gray-900 min-w-16 text-center"
        />
        {unit ? (
          <Text className="text-lg font-semibold text-gray-900 -ml-2 mr-1">
            {unit}
          </Text>
        ) : null}
        <Pressable
          onPress={inc}
          accessibilityLabel={`Increase ${label}`}
          className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center"
        >
          <Text className="text-xl font-bold text-gray-800">+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatValue(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
