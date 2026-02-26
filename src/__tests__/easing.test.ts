import { describe, it, expect } from "vitest";
import {
  lerp,
  easeInOutCubic,
  easeInOutQuint,
  easeInFastOutSlow,
  getEasingFunction,
} from "../utils/easing.js";

describe("lerp", () => {
  it("returns start value at t=0", () => {
    expect(lerp(10, 20, 0)).toBe(10);
  });

  it("returns end value at t=1", () => {
    expect(lerp(10, 20, 1)).toBe(20);
  });

  it("returns midpoint at t=0.5", () => {
    expect(lerp(0, 100, 0.5)).toBe(50);
  });
});

describe("easeInOutCubic", () => {
  it("returns 0 at t=0", () => {
    expect(easeInOutCubic(0)).toBe(0);
  });

  it("returns 1 at t=1", () => {
    expect(easeInOutCubic(1)).toBe(1);
  });

  it("returns 0.5 at t=0.5", () => {
    expect(easeInOutCubic(0.5)).toBe(0.5);
  });

  it("is symmetric around midpoint", () => {
    expect(easeInOutCubic(0.25) + easeInOutCubic(0.75)).toBeCloseTo(1);
  });
});

describe("easeInOutQuint", () => {
  it("returns 0 at t=0", () => {
    expect(easeInOutQuint(0)).toBe(0);
  });

  it("returns 1 at t=1", () => {
    expect(easeInOutQuint(1)).toBe(1);
  });

  it("is symmetric around midpoint", () => {
    expect(easeInOutQuint(0.25) + easeInOutQuint(0.75)).toBeCloseTo(1);
  });

  it("accelerates more aggressively than cubic", () => {
    // At t=0.25, quintic should be closer to 0 (slower start)
    expect(easeInOutQuint(0.25)).toBeLessThan(easeInOutCubic(0.25));
  });
});

describe("easeInFastOutSlow (cinematic)", () => {
  it("returns 0 at t=0", () => {
    expect(easeInFastOutSlow(0)).toBe(0);
  });

  it("returns 1 at t=1", () => {
    expect(easeInFastOutSlow(1)).toBe(1);
  });

  it("covers ~50% of journey by t=0.3 (blend point)", () => {
    expect(easeInFastOutSlow(0.3)).toBeCloseTo(0.5);
  });

  it("is monotonically increasing", () => {
    let prev = 0;
    for (let t = 0.01; t <= 1; t += 0.01) {
      const val = easeInFastOutSlow(t);
      expect(val).toBeGreaterThanOrEqual(prev);
      prev = val;
    }
  });
});

describe("getEasingFunction", () => {
  it("returns correct function for each name", () => {
    expect(getEasingFunction("cinematic")(0.3)).toBeCloseTo(0.5);
    expect(getEasingFunction("cubic")(0.5)).toBe(0.5);
    expect(getEasingFunction("quintic")(0.5)).toBe(0.5);
    expect(getEasingFunction("linear")(0.73)).toBe(0.73);
  });
});
