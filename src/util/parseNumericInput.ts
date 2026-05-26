// Parses keyboard text from a tap-to-type stepper field into a non-negative
// number, or null when the text isn't a valid entry. Null is the signal to
// preserve the field's prior value (empty/garbage input is not a confirmation).
//
// Reps use integer mode (number-pad); weight uses decimal mode (decimal-pad),
// which accepts arbitrary decimals — not just multiples of the 2.5 kg step.
export function parseNumericInput(
  text: string,
  options: { decimal: boolean }
): number | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;

  if (options.decimal) {
    // "77", "77.5", "77.", or ".5" — non-negative only.
    if (!/^(\d+(\.\d*)?|\.\d+)$/.test(trimmed)) return null;
    const n = Number.parseFloat(trimmed);
    if (!Number.isFinite(n)) return null;
    return Math.round(n * 100) / 100;
  }

  if (!/^\d+$/.test(trimmed)) return null;
  return Number.parseInt(trimmed, 10);
}
