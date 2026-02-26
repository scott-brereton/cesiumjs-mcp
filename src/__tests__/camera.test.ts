import { describe, it, expect } from "vitest";
import { computeCameraFrames } from "../cesium/camera.js";

const DEFAULT_OPTS = {
  longitude: -87.6298,
  latitude: 41.8781,
  startAltitude: 800000,
  endAltitude: 2000,
  tiltAngle: 45,
  heading: 0,
  totalFrames: 180,
  easing: "cinematic" as const,
};

describe("computeCameraFrames", () => {
  it("returns the correct number of frames", () => {
    const frames = computeCameraFrames(DEFAULT_OPTS);
    expect(frames).toHaveLength(180);
  });

  it("first frame starts at start altitude", () => {
    const frames = computeCameraFrames(DEFAULT_OPTS);
    expect(frames[0].altitude).toBeCloseTo(DEFAULT_OPTS.startAltitude, -1);
  });

  it("last frame ends at end altitude", () => {
    const frames = computeCameraFrames(DEFAULT_OPTS);
    expect(frames[179].altitude).toBeCloseTo(DEFAULT_OPTS.endAltitude, -1);
  });

  it("altitude is monotonically decreasing", () => {
    const frames = computeCameraFrames(DEFAULT_OPTS);
    for (let i = 1; i < frames.length; i++) {
      expect(frames[i].altitude).toBeLessThanOrEqual(frames[i - 1].altitude);
    }
  });

  it("all frames have the same longitude and latitude", () => {
    const frames = computeCameraFrames(DEFAULT_OPTS);
    for (const frame of frames) {
      expect(frame.longitude).toBe(DEFAULT_OPTS.longitude);
      expect(frame.latitude).toBe(DEFAULT_OPTS.latitude);
    }
  });

  it("first frame pitch is -90 (looking straight down)", () => {
    const frames = computeCameraFrames(DEFAULT_OPTS);
    expect(frames[0].pitch).toBe(-90);
  });

  it("last frame pitch reflects tilt angle", () => {
    const frames = computeCameraFrames(DEFAULT_OPTS);
    expect(frames[179].pitch).toBeCloseTo(-(90 - DEFAULT_OPTS.tiltAngle));
  });

  it("pitch never goes above the final tilt angle", () => {
    const frames = computeCameraFrames(DEFAULT_OPTS);
    const minPitch = -(90 - DEFAULT_OPTS.tiltAngle);
    for (const frame of frames) {
      expect(frame.pitch).toBeLessThanOrEqual(minPitch + 0.01);
    }
  });

  it("all frames have roll = 0", () => {
    const frames = computeCameraFrames(DEFAULT_OPTS);
    for (const frame of frames) {
      expect(frame.roll).toBe(0);
    }
  });

  it("heading is preserved across all frames", () => {
    const frames = computeCameraFrames({ ...DEFAULT_OPTS, heading: 90 });
    for (const frame of frames) {
      expect(frame.heading).toBe(90);
    }
  });

  it("works with linear easing", () => {
    const frames = computeCameraFrames({ ...DEFAULT_OPTS, easing: "linear" });
    expect(frames).toHaveLength(180);
    expect(frames[0].altitude).toBeCloseTo(DEFAULT_OPTS.startAltitude, -1);
    expect(frames[179].altitude).toBeCloseTo(DEFAULT_OPTS.endAltitude, -1);
  });
});
