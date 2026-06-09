// Parses keyboard text from a tap-to-type numeric field into a non-negative
// number, or null when the text isn't a valid entry. Null is the signal to
// preserve the field's prior value (empty/garbage input is not a confirmation).
//
// Reps use integer mode (number-pad); weight uses decimal mode (decimal-pad),
// which accepts arbitrary decimals — never snapped to a plate grid.
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
    return normalizeWeight(n);
  }

  if (!/^\d+$/.test(trimmed)) return null;
  return Number.parseInt(trimmed, 10);
}

// Weights are stored and displayed at one decimal place, so the value the
// user sees is always exactly the value on record. 82.5 survives unchanged.
export function normalizeWeight(n: number): number {
  return Math.round(n * 10) / 10;
}

// Renders a stored value for a numeric field: whole numbers stay bare ("80"),
// fractional values show exactly one decimal ("82.5") — never two, so the
// display always round-trips through parseNumericInput to the stored value.
export function formatNumericValue(n: number): string {
  const normalized = normalizeWeight(n);
  return Number.isInteger(normalized) ? String(normalized) : normalized.toFixed(1);
}
