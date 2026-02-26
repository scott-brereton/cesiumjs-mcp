import { lerp, type EasingName, getEasingFunction } from "../utils/easing.js";

export interface CameraFrame {
  longitude: number;
  latitude: number;
  altitude: number;
  heading: number;
  pitch: number;
  roll: number;
}

export interface CameraAnimationOptions {
  longitude: number;
  latitude: number;
  startAltitude: number;
  endAltitude: number;
  tiltAngle: number;
  heading: number;
  totalFrames: number;
  easing: EasingName;
}

/**
 * Pre-compute all camera frames for a fly-in animation.
 *
 * Uses logarithmic altitude interpolation (visual change is perceived
 * logarithmically) combined with the selected easing function.
 *
 * Pitch transitions from -90° (looking straight down) to the final
 * tilt angle, but only begins pitching once we're past the halfway
 * point of the eased timeline - this keeps the camera looking straight
 * down during the fast descent, then gradually tilts as we settle.
 */
export function computeCameraFrames(opts: CameraAnimationOptions): CameraFrame[] {
  const {
    longitude,
    latitude,
    startAltitude,
    endAltitude,
    tiltAngle,
    heading,
    totalFrames,
    easing,
  } = opts;

  const easingFn = getEasingFunction(easing);
  const logStart = Math.log(startAltitude);
  const logEnd = Math.log(endAltitude);

  const frames: CameraFrame[] = [];

  for (let i = 0; i < totalFrames; i++) {
    const rawT = i / (totalFrames - 1); // 0 to 1
    const easedT = easingFn(rawT);

    // Logarithmic altitude interpolation
    const logAlt = lerp(logStart, logEnd, easedT);
    const altitude = Math.exp(logAlt);

    // Pitch: only start tilting once we're in the settle phase (eased t > 0.5)
    // This keeps the camera looking straight down during the fast descent,
    // then smoothly tilts as we approach the city.
    let pitch: number;
    if (easedT < 0.5) {
      pitch = -90;
    } else {
      const pitchT = (easedT - 0.5) / 0.5; // 0 to 1 over the settle phase
      const smoothPitchT = pitchT * pitchT * (3 - 2 * pitchT); // smoothstep
      pitch = lerp(-90, -(90 - tiltAngle), smoothPitchT);
    }

    frames.push({
      longitude,
      latitude,
      altitude,
      heading,
      pitch,
      roll: 0,
    });
  }

  return frames;
}
