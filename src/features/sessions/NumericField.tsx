import { useState } from "react";
import { TextInput } from "react-native";
import {
  parseNumericInput,
  formatNumericValue,
} from "@shared/lib/parseNumericInput";
import { colors } from "@shared/theme";

type Props = {
  accessibilityLabel: string;
  value: number;
  // Reps are integer-only (number-pad); weight allows arbitrary decimals
  // (decimal-pad), normalised to one decimal place.
  decimal?: boolean;
  onChange: (value: number) => void;
};

// A plain tap-to-type numeric field: tapping selects the contents for easy
// overtype, the value commits on blur/submit, and invalid or empty input
// preserves the prior value. Column labels/units live in the SetRow header,
// not here.
export function NumericField({
  accessibilityLabel,
  value,
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
      accessibilityLabel={`${accessibilityLabel}, tap to type`}
      // TextInput text color must be set via the `style` prop; NativeWind's
      // className doesn't reliably apply `color` to native input text.
      style={{ color: colors.primary }}
      className="bg-card-elevated rounded-control px-3 py-2.5 text-base font-semibold text-center"
    />
  );
}
