/**
 * @file progressionDeload.ts
 * @role Obliczenia deloadu Epley na siatce talerzy oraz zliczanie zastojów sesyjnych.
 */

import { epley } from './workout';

const DELOAD_FACTOR_DEFAULT = 0.9;
export const DEFAULT_INCREMENT_KG = 2.5;

export interface PastSessionResult {
  weight: number;
  reps: number[];
  targetReps: number;
  targetWeight: number;
  amrapReps?: number;
  ok: boolean;
}

/**
 * Szuka kandydata na deload Epley na siatce talerzy o kroku `step`.
 */
export function selectEpleyDeloadCandidate(
  currentWeight: number,
  targetReps: number,
  step = DEFAULT_INCREMENT_KG,
  factor = DELOAD_FACTOR_DEFAULT
): { weight: number; reps: number; target1RM: number } | null {
  if (currentWeight <= 0 || targetReps <= 0 || step <= 0) return null;

  const current1RM = epley(currentWeight, targetReps);
  if (!current1RM) return null;

  const target1RM = current1RM * factor;
  let bestCandidate: { weight: number; reps: number; error: number } | null = null;

  // Przeszukaj dopuszczalne powtórzenia (od targetReps - 2 do targetReps + 2)
  for (let r = Math.max(1, targetReps - 2); r <= targetReps + 2; r++) {
    const idealWeight = target1RM / (1 + r / 30);
    // Zaokrąglenie do siatki talerzy
    const low = Math.floor(idealWeight / step) * step;
    const high = Math.ceil(idealWeight / step) * step;
    const candidates = [low, high].filter((w) => w > 0 && w <= currentWeight);

    for (const w of candidates) {
      const cand1RM = epley(w, r);
      if (!cand1RM) continue;
      const error = Math.abs(cand1RM - target1RM);
      if (!bestCandidate || error < bestCandidate.error) {
        bestCandidate = { weight: w, reps: r, error };
      }
    }
  }

  if (!bestCandidate) {
    const fallbackWeight = Math.max(step, Math.round((currentWeight * factor) / step) * step);
    return { weight: fallbackWeight, reps: targetReps, target1RM };
  }

  return { weight: bestCandidate.weight, reps: bestCandidate.reps, target1RM };
}

/**
 * Liczy liczbę kolejnych sesji bez sukcesu (stalls).
 */
export function countConsecutiveStalls(sessions: PastSessionResult[]): number {
  let count = 0;
  for (let i = sessions.length - 1; i >= 0; i--) {
    if (sessions[i].ok) break;
    count++;
  }
  return count;
}
