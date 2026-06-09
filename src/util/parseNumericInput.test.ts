import {
  parseNumericInput,
  normalizeWeight,
  formatNumericValue,
} from "./parseNumericInput";

describe("parseNumericInput", () => {
  describe("integer mode (reps)", () => {
    it("parses a plain integer", () => {
      expect(parseNumericInput("12", { decimal: false })).toBe(12);
    });

    it("parses zero", () => {
      expect(parseNumericInput("0", { decimal: false })).toBe(0);
    });

    it("ignores surrounding whitespace", () => {
      expect(parseNumericInput("  8 ", { decimal: false })).toBe(8);
    });

    it("rejects a decimal value (integer-only field)", () => {
      expect(parseNumericInput("12.5", { decimal: false })).toBeNull();
    });

    it("rejects empty input (preserve prior)", () => {
      expect(parseNumericInput("", { decimal: false })).toBeNull();
    });

    it("rejects non-numeric garbage", () => {
      expect(parseNumericInput("abc", { decimal: false })).toBeNull();
    });

    it("rejects negatives", () => {
      expect(parseNumericInput("-5", { decimal: false })).toBeNull();
    });
  });

  describe("decimal mode (weight)", () => {
    it("parses an arbitrary decimal not on the 2.5 grid", () => {
      expect(parseNumericInput("77.5", { decimal: true })).toBe(77.5);
    });

    it("preserves a one-decimal value exactly (no grid snap)", () => {
      expect(parseNumericInput("82.5", { decimal: true })).toBe(82.5);
    });

    it("parses an integer in decimal mode", () => {
      expect(parseNumericInput("80", { decimal: true })).toBe(80);
    });

    it("parses a leading-dot decimal", () => {
      expect(parseNumericInput(".5", { decimal: true })).toBe(0.5);
    });

    it("parses a trailing-dot decimal", () => {
      expect(parseNumericInput("60.", { decimal: true })).toBe(60);
    });

    it("normalises to 1 decimal place so stored equals displayed", () => {
      expect(parseNumericInput("77.56", { decimal: true })).toBe(77.6);
      expect(parseNumericInput("77.555", { decimal: true })).toBe(77.6);
    });

    it("rejects empty input (preserve prior)", () => {
      expect(parseNumericInput("", { decimal: true })).toBeNull();
    });

    it("rejects non-numeric garbage", () => {
      expect(parseNumericInput("12kg", { decimal: true })).toBeNull();
    });

    it("rejects negatives", () => {
      expect(parseNumericInput("-2.5", { decimal: true })).toBeNull();
    });
  });

  describe("normalizeWeight", () => {
    it("rounds to one decimal place", () => {
      expect(normalizeWeight(77.56)).toBe(77.6);
    });

    it("preserves a one-decimal value exactly (no grid snap)", () => {
      expect(normalizeWeight(82.5)).toBe(82.5);
    });

    it("preserves whole numbers and zero", () => {
      expect(normalizeWeight(80)).toBe(80);
      expect(normalizeWeight(0)).toBe(0);
    });
  });

  describe("formatNumericValue", () => {
    it("shows whole numbers without a decimal", () => {
      expect(formatNumericValue(80)).toBe("80");
      expect(formatNumericValue(0)).toBe("0");
    });

    it("shows fractional values at exactly one decimal", () => {
      expect(formatNumericValue(82.5)).toBe("82.5");
    });

    it("never shows two decimals, even for a legacy 2-dp stored value", () => {
      expect(formatNumericValue(77.56)).toBe("77.6");
    });

    it("round-trips with parseNumericInput so displayed always equals stored", () => {
      for (const stored of [0, 5, 60, 77.6, 82.5, 100.1]) {
        expect(
          parseNumericInput(formatNumericValue(stored), { decimal: true })
        ).toBe(stored);
      }
    });
  });
});
