import { parseNumericInput } from "./parseNumericInput";

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

    it("parses an integer in decimal mode", () => {
      expect(parseNumericInput("80", { decimal: true })).toBe(80);
    });

    it("parses a leading-dot decimal", () => {
      expect(parseNumericInput(".5", { decimal: true })).toBe(0.5);
    });

    it("parses a trailing-dot decimal", () => {
      expect(parseNumericInput("60.", { decimal: true })).toBe(60);
    });

    it("rounds to 2 decimal places to avoid float noise", () => {
      expect(parseNumericInput("77.555", { decimal: true })).toBe(77.56);
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
});
