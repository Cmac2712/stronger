import { useState } from "react";
import { View, Text, TextInput } from "react-native";
import {
  parseNumericInput,
  formatNumericValue,
} from "../util/parseNumericInput";
import { colors } from "../theme";

type Props = {
  label: string;
  value: number;
  unit?: string;
  // Reps are integer-only (number-pad); weight allows arbitrary decimals
  // (decimal-pad), normalised to one decimal place.
  decimal?: boolean;
  onChange: (value: number) => void;
};

// A plain tap-to-type numeric field: tapping selects the contents for easy
// overtype, the value commits on blur/submit, and invalid or empty input
// preserves the prior value.
export function NumericField({
  label,
  value,
  unit,
  decimal = false,
  onChange,
}: Props) {
  // null = not editing: display the formatted prop value. A string = the
  // in-progress keyboard draft.
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const parsed = parseNumericInput(draft, { decimal });
    // Invalid/empty input is not a confirmation: keep the prior value.
    // parseNumericInput never returns negatives, so no clamping is needed.
    if (parsed !== null) onChange(parsed);
    setDraft(null);
  };

  return (
    <View className="items-center">
      <Text className="text-xs text-muted mb-1">{label}</Text>
      <View className="flex-row items-center">
        <TextInput
          value={draft ?? formatNumericValue(value)}
          onChangeText={setDraft}
          onFocus={() => setDraft(formatNumericValue(value))}
          onEndEditing={commit}
          onSubmitEditing={commit}
          keyboardType={decimal ? "decimal-pad" : "number-pad"}
          keyboardAppearance="dark"
          placeholderTextColor={colors.muted}
          selectTextOnFocus
          accessibilityLabel={`${label} value, tap to type`}
          // TextInput text color must be set via the `style` prop; NativeWind's
          // className doesn't reliably apply `color` to native input text.
          style={{ color: colors.primary }}
          className="bg-card-elevated rounded-control px-4 py-2 text-lg font-semibold min-w-20 text-center"
        />
        {unit ? (
          <Text className="text-lg font-semibold text-primary ml-2">
            {unit}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
