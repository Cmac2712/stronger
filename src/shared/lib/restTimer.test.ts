import {
  RestTimer,
  startRest,
  pauseRest,
  resumeRest,
  resetRest,
  restRemainingMs,
  isRestExpired,
} from "./restTimer";

const idle: RestTimer = { status: "idle", durationMs: 120_000 };

describe("restTimer", () => {
  describe("startRest", () => {
    it("produces a running timer ending durationMs from now", () => {
      const t = startRest(120_000, 1_000);
      expect(t).toEqual({ status: "running", endsAt: 121_000, durationMs: 120_000 });
    });
  });

  describe("restRemainingMs", () => {
    it("counts down from a running timer using now", () => {
      const t = startRest(120_000, 1_000);
      expect(restRemainingMs(t, 1_000)).toBe(120_000);
      expect(restRemainingMs(t, 31_000)).toBe(90_000);
    });

    it("clamps to zero once a running timer has elapsed", () => {
      const t = startRest(120_000, 1_000);
      expect(restRemainingMs(t, 999_000)).toBe(0);
    });

    it("is the frozen remaining value while paused (independent of now)", () => {
      const paused = pauseRest(startRest(120_000, 1_000), 31_000);
      expect(restRemainingMs(paused, 500_000)).toBe(90_000);
    });

    it("is zero when idle", () => {
      expect(restRemainingMs(idle, 1_000)).toBe(0);
    });
  });

  describe("pauseRest", () => {
    it("freezes the remaining time at the moment of pausing", () => {
      const paused = pauseRest(startRest(120_000, 1_000), 31_000);
      expect(paused).toEqual({
        status: "paused",
        remainingMs: 90_000,
        durationMs: 120_000,
      });
    });

    it("is a no-op on a non-running timer", () => {
      expect(pauseRest(idle, 5_000)).toEqual(idle);
    });
  });

  describe("resumeRest", () => {
    it("restarts the countdown from the frozen remaining time", () => {
      const paused = pauseRest(startRest(120_000, 1_000), 31_000);
      const resumed = resumeRest(paused, 50_000);
      expect(resumed).toEqual({
        status: "running",
        endsAt: 140_000,
        durationMs: 120_000,
      });
      expect(restRemainingMs(resumed, 50_000)).toBe(90_000);
    });

    it("is a no-op on a non-paused timer", () => {
      const running = startRest(120_000, 1_000);
      expect(resumeRest(running, 5_000)).toEqual(running);
    });
  });

  describe("resetRest", () => {
    it("restarts a running countdown from the full configured duration", () => {
      const reset = resetRest(startRest(120_000, 1_000), 60_000);
      expect(reset).toEqual({
        status: "running",
        endsAt: 180_000,
        durationMs: 120_000,
      });
    });

    it("restarts from full duration even when paused", () => {
      const paused = pauseRest(startRest(120_000, 1_000), 31_000);
      expect(resetRest(paused, 60_000)).toEqual({
        status: "running",
        endsAt: 180_000,
        durationMs: 120_000,
      });
    });

    it("restarts an idle timer from its stored duration", () => {
      expect(resetRest(idle, 60_000)).toEqual({
        status: "running",
        endsAt: 180_000,
        durationMs: 120_000,
      });
    });
  });

  describe("isRestExpired", () => {
    it("is true once a running timer reaches zero", () => {
      const t = startRest(120_000, 1_000);
      expect(isRestExpired(t, 120_000)).toBe(false);
      expect(isRestExpired(t, 121_000)).toBe(true);
    });

    it("is false while paused or idle", () => {
      const paused = pauseRest(startRest(120_000, 1_000), 31_000);
      expect(isRestExpired(paused, 999_000)).toBe(false);
      expect(isRestExpired(idle, 999_000)).toBe(false);
    });
  });
});
