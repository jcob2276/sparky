/**
 * Jedna definicja minimum białka i celu snu (docs/SINGLE_SOURCE.md). Edge (`_shared/personalTargets.ts`) i frontend
 * czytają te same wiersze i liczą tą samą funkcją, więc „Dziś”, pulpit i Oracle pokazują tę samą liczbę.
 */
export const DEFAULT_PROTEIN_FLOOR_G = 150;
export const DEFAULT_SLEEP_TARGET_H = 8;

export interface PersonalTargetsInput {
  /** Najnowszy wiersz `nutrition_targets`. */
  target?: { protein_floor_g?: number | string | null; target_kcal?: number | string | null } | null;
  /** `nutrition_profile`. */
  profile?: { protein_g_per_kg?: number | string | null; sleep_target_hours?: number | string | null } | null;
  /** Ostatnia waga z `body_metrics`. */
  weightKg?: number | string | null;
}

export interface ResolvedPersonalTargets {
  proteinFloorG: number;
  targetKcal: number | null;
  sleepTargetH: number;
}

const positive = (value: unknown): number | null => {
  const n = value == null || value === '' ? NaN : Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Białko: wiersz targets, potem waga × g/kg z profilu, potem wartość awaryjna. */
export function derivePersonalTargets({ target, profile, weightKg }: PersonalTargetsInput): ResolvedPersonalTargets {
  const perKg = positive(profile?.protein_g_per_kg);
  const weight = positive(weightKg);
  const proteinFloorG = positive(target?.protein_floor_g) ?? (perKg != null && weight != null ? Math.round(weight * perKg) : DEFAULT_PROTEIN_FLOOR_G);
  return {
    proteinFloorG,
    targetKcal: target?.target_kcal != null ? Number(target.target_kcal) : null,
    sleepTargetH: positive(profile?.sleep_target_hours) ?? DEFAULT_SLEEP_TARGET_H,
  };
}
