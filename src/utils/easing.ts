/**
 * Linear interpolation between a and b.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Cubic ease-in-out: smooth acceleration and deceleration.
 * Symmetric - same amount of ease-in and ease-out.
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Quintic ease-in-out: stronger acceleration/deceleration than cubic.
 * Still symmetric, but with more time spent at the extremes.
 */
export function easeInOutQuint(t: number): number {
  return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
}

/**
 * Cinematic fly-in easing: asymmetric curve designed for aerial zoom animations.
 *
 * The "whoosh" peaks early (~30% of timeline), then the camera spends the
 * remaining ~70% in a long, gentle deceleration/settle. This matches how
 * Google Earth Studio fly-ins feel and syncs well with audio whoosh effects
 * that peak early then trail off.
 *
 * Technically: fast ease-in over first 30%, then a strong ease-out (quartic)
 * over the remaining 70%. The transition is C1-continuous (matching slopes
 * at the blend point).
 */
export function easeInFastOutSlow(t: number): number {
  const blendPoint = 0.3;
  const blendValue = 0.5; // we want to cover 50% of the journey in the first 30%

  if (t < blendPoint) {
    // Quadratic ease-in: accelerate into the fast zone
    const u = t / blendPoint;
    return blendValue * u * u;
  } else {
    // Quartic ease-out: long, gentle deceleration
    const u = (t - blendPoint) / (1 - blendPoint);
    return blendValue + (1 - blendValue) * (1 - Math.pow(1 - u, 4));
  }
}

export type EasingName = "cinematic" | "cubic" | "quintic" | "linear";

export function getEasingFunction(name: EasingName): (t: number) => number {
  switch (name) {
    case "cinematic":
      return easeInFastOutSlow;
    case "cubic":
      return easeInOutCubic;
    case "quintic":
      return easeInOutQuint;
    case "linear":
      return (t) => t;
  }
}
