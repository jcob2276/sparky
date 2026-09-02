import { epley1rm } from '../fitness.ts';

/**
 * Effective-reps decay: set far from failure stimulates less than one at failure.
 * Missing RIR → assume the set counted (don't punish missing data).
 */
export function rirEffectiveness(rir: number | null | undefined): number {
  if (rir == null || Number.isNaN(rir)) return 1;
  if (rir <= 1) return 1;
  if (rir <= 2) return 0.9;
  if (rir <= 4) return 0.7;
  if (rir <= 6) return 0.45;
  return 0.25;
}

/** e1RM with reps extended by logged RIR (effort-adjusted estimate). */
export function rirAdjustedE1rm(
  weight: number,
  reps: number,
  rir?: number | null,
): number | null {
  if (!weight || weight <= 0 || !reps || reps <= 0) return null;
  const bonus = rir != null && !Number.isNaN(rir) ? Math.max(0, rir) : 0;
  return epley1rm(weight, reps + bonus);
}

/** Load × reps × RIR effectiveness. BW (weight=0) → reps × effectiveness. */
export function effectiveVolume(
  weight: number,
  reps: number,
  rir?: number | null,
): number {
  if (!reps || reps <= 0) return 0;
  const factor = rirEffectiveness(rir);
  if (!weight || weight <= 0) return reps * factor;
  return weight * reps * factor;
}

/** Hard set = at or within ~2 reps of failure (or RIR unknown). */
export function isHardSet(rir: number | null | undefined, threshold = 2): boolean {
  if (rir == null || Number.isNaN(rir)) return true;
  return rir <= threshold;
}
