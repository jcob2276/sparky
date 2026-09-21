/**
 * @file progressionEngine.ts
 * @role Deterministyczny silnik progresji wielopolitykowej adaptowany z openGym.
 * Obsługuje polityki:
 * - Linear (liniowa ze śledzeniem zastojów)
 * - Greyskull LP (AMRAP z podwójnym skokiem i resetem -10%)
 * - Double Progression (wspinaczka w przedziale powtórzeń min-max)
 * - Assisted (odwrócona progresja dla maszyn ze wsparciem)
 * - Bodyweight (progresja powtórzeniami, a następnie seriami do limitu)
 * Oraz Epley Deload Candidate Search (dopasowanie ciężaru deloadu do siatki talerzy).
 */

import { epley } from './workout';

export type ProgressionPolicy = 'off' | 'linear' | 'greyskull' | 'double' | 'assisted' | 'bodyweight';

export interface ProgressionTargetConfig {
  policy: ProgressionPolicy;
  weight: number;
  reps: number;
  sets: number;
  repsMin?: number;
  repsMax?: number;
  incrementKg?: number;
  deloadFactor?: number; // Domyślnie 0.9 (10% deload)
  isAssisted?: boolean;
}

export interface PastSessionResult {
  weight: number;
  reps: number[];
  targetReps: number;
  targetWeight: number;
  amrapReps?: number; // Ostatnia seria do upadku w Greyskull
  ok: boolean;
}

export interface NextPrescriptionResult {
  policy: ProgressionPolicy;
  kind: 'up' | 'hold' | 'deload' | 'off' | 'first';
  weight: number;
  reps: number;
  sets: number;
  why: string;
}

export const DELOAD_FACTOR_DEFAULT = 0.9;
export const MAX_BW_SETS = 6;
export const DEFAULT_INCREMENT_KG = 2.5;

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

/**
 * Oblicza kolejną preskrypcję treningową dla danego ćwiczenia.
 */
// eslint-disable-next-line max-lines-per-function
export function computeNextPrescription(
  cfg: ProgressionTargetConfig,
  history: PastSessionResult[]
): NextPrescriptionResult {
  const policy = cfg.policy;
  const inc = cfg.incrementKg && cfg.incrementKg > 0 ? cfg.incrementKg : DEFAULT_INCREMENT_KG;
  const targetSets = cfg.sets || 3;
  const targetReps = cfg.reps || 8;
  const targetWeight = cfg.weight || 0;

  if (policy === 'off') {
    return {
      policy,
      kind: 'off',
      weight: targetWeight,
      reps: targetReps,
      sets: targetSets,
      why: 'Automatyczna progresja jest wyłączona dla tego ćwiczenia.',
    };
  }

  if (!history.length) {
    return {
      policy,
      kind: 'first',
      weight: targetWeight,
      reps: targetReps,
      sets: targetSets,
      why: 'Brak wcześniejszej historii — ta sesja ustala punkt bazowy.',
    };
  }

  const last = history[history.length - 1];
  const stalls = countConsecutiveStalls(history);

  // 1. Polityka Bodyweight
  if (policy === 'bodyweight' || (targetWeight === 0 && !cfg.isAssisted)) {
    if (last.ok) {
      const repsMax = cfg.repsMax || 25;
      if (last.targetReps >= repsMax) {
        if (targetSets < MAX_BW_SETS) {
          const newSets = targetSets + 1;
          const resetReps = cfg.repsMin || 10;
          return {
            policy: 'bodyweight',
            kind: 'up',
            weight: 0,
            reps: resetReps,
            sets: newSets,
            why: `Osiągnięto ${repsMax} powtórzeń we wszystkich seriach! Dodano serię (${newSets}), powtórzenia zresetowane do ${resetReps}.`,
          };
        }
        return {
          policy: 'bodyweight',
          kind: 'hold',
          weight: 0,
          reps: repsMax,
          sets: targetSets,
          why: `${targetSets} serii po ${repsMax} powtórzeń osiągnięte! Czas na dodanie ciężaru zewnętrznego lub trudniejszą wariację.`,
        };
      }
      return {
        policy: 'bodyweight',
        kind: 'up',
        weight: 0,
        reps: last.targetReps + 1,
        sets: targetSets,
        why: `Wszystkie powtórzenia domknięte! Cel zwiększony o +1 powtórzenie (${last.targetReps + 1}).`,
      };
    }
    return {
      policy: 'bodyweight',
      kind: 'hold',
      weight: 0,
      reps: last.targetReps,
      sets: targetSets,
      why: 'Ostatnia sesja nie została w pełni domknięta — powtórz ten sam cel.',
    };
  }

  // 2. Polityka Maszyn ze Wsparciem (Assisted)
  if (policy === 'assisted' || cfg.isAssisted) {
    if (last.ok) {
      const newWeight = Math.max(0, last.weight - inc);
      return {
        policy: 'assisted',
        kind: 'up',
        weight: newWeight,
        reps: targetReps,
        sets: targetSets,
        why: `Komplet powtórzeń! Zmniejszono wsparcie o -${inc} kg (nowa asysta: ${newWeight} kg).`,
      };
    }
    if (stalls >= 2) {
      const deloadWeight = last.weight + inc;
      return {
        policy: 'assisted',
        kind: 'deload',
        weight: deloadWeight,
        reps: targetReps,
        sets: targetSets,
        why: `Zastój przez ${stalls} sesje — zwiększono wsparcie o +${inc} kg (${deloadWeight} kg) w celu odbudowy.`,
      };
    }
    return {
      policy: 'assisted',
      kind: 'hold',
      weight: last.weight,
      reps: targetReps,
      sets: targetSets,
      why: 'Powtórz ten sam poziom asysty, aż wszystkie serie będą domknięte.',
    };
  }

  // 3. Polityka Greyskull LP
  if (policy === 'greyskull') {
    if (last.ok) {
      const amrap = last.amrapReps || 0;
      const isDoubleJump = amrap >= last.targetReps * 2;
      const jump = isDoubleJump ? inc * 2 : inc;
      return {
        policy: 'greyskull',
        kind: 'up',
        weight: last.weight + jump,
        reps: last.targetReps,
        sets: targetSets,
        why: isDoubleJump
          ? `Ostatnia seria AMRAP wyniosła ${amrap} powtórzeń (≥ 2x cel)! Podwójny skok ciężaru: +${jump} kg.`
          : `Wszystkie serie zaliczone! Ciężar w górę o +${jump} kg.`,
      };
    }
    // Greyskull deloaduje natychmiast po 1 nieudanej sesji do 90%
    const deload = selectEpleyDeloadCandidate(last.weight, last.targetReps, inc, 0.9);
    const newWeight = deload ? deload.weight : Math.max(inc, Math.round((last.weight * 0.9) / inc) * inc);
    const newReps = deload ? deload.reps : last.targetReps;
    return {
      policy: 'greyskull',
      kind: 'deload',
      weight: newWeight,
      reps: newReps,
      sets: targetSets,
      why: `Nieudana próba — deload Greyskull -10% do ${newWeight} kg (${newReps} powt.) w celu odbudowy pędu.`,
    };
  }

  // 4. Polityka Double Progression (Rep-Range)
  if (policy === 'double') {
    const bottom = cfg.repsMin || 8;
    const top = cfg.repsMax || 12;

    if (last.ok && last.reps.every((r) => r >= top)) {
      return {
        policy: 'double',
        kind: 'up',
        weight: last.weight + inc,
        reps: bottom,
        sets: targetSets,
        why: `Osiągnięto szczyt zakresu (${top} powt.) we wszystkich seriach! Ciężar +${inc} kg, powtórzenia zresetowane do ${bottom}.`,
      };
    }

    if (stalls >= 3) {
      const deload = selectEpleyDeloadCandidate(last.weight, bottom, inc, cfg.deloadFactor || 0.9);
      const newWeight = deload ? deload.weight : Math.max(inc, Math.round((last.weight * 0.9) / inc) * inc);
      return {
        policy: 'double',
        kind: 'deload',
        weight: newWeight,
        reps: bottom,
        sets: targetSets,
        why: `Zastój przez ${stalls} sesje w przedziale powtórzeń — deload do ${newWeight} kg.`,
      };
    }

    const minRepsDone = last.reps.length ? Math.min(...last.reps) : bottom;
    const nextAim = Math.min(top, Math.max(bottom, minRepsDone + 1));
    return {
      policy: 'double',
      kind: 'hold',
      weight: last.weight,
      reps: nextAim,
      sets: targetSets,
      why: `Ten sam ciężar (${last.weight} kg) — wspinaj się w przedziale, celuj w ${nextAim} powtórzeń.`,
    };
  }

  // 5. Polityka Linear
  if (last.ok) {
    return {
      policy: 'linear',
      kind: 'up',
      weight: last.weight + inc,
      reps: targetReps,
      sets: targetSets,
      why: `Komplet powtórzeń w poprzedniej sesji! Ciężar w górę o +${inc} kg.`,
    };
  }

  if (stalls >= 3) {
    const deload = selectEpleyDeloadCandidate(last.weight, targetReps, inc, cfg.deloadFactor || 0.9);
    const newWeight = deload ? deload.weight : Math.max(inc, Math.round((last.weight * 0.9) / inc) * inc);
    const newReps = deload ? deload.reps : targetReps;
    return {
      policy: 'linear',
      kind: 'deload',
      weight: newWeight,
      reps: newReps,
      sets: targetSets,
      why: `Zastój przez ${stalls} sesje z rzędu — Epley deload do ${newWeight} kg (${newReps} powt.).`,
    };
  }

  return {
    policy: 'linear',
    kind: 'hold',
    weight: last.weight,
    reps: targetReps,
    sets: targetSets,
    why: `Niepełne powtórzenia (${stalls}/3 do deloadu) — powtórz ${last.weight} kg.`,
  };
}
