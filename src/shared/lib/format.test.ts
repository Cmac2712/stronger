import { formatRestClock } from "./format";

describe("formatRestClock", () => {
  it("formats a whole-minute duration as m:ss", () => {
    expect(formatRestClock(120_000)).toBe("2:00");
  });

  it("pads seconds to two digits", () => {
    expect(formatRestClock(65_000)).toBe("1:05");
  });

  it("formats a sub-minute duration with a zero minutes place", () => {
    expect(formatRestClock(5_000)).toBe("0:05");
  });

  it("rounds up partial seconds so the clock hits 0:00 only at zero", () => {
    expect(formatRestClock(90_500)).toBe("1:31");
  });

  it("shows 0:00 at and below zero", () => {
    expect(formatRestClock(0)).toBe("0:00");
    expect(formatRestClock(-5_000)).toBe("0:00");
  });
});
