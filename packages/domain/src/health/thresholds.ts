export const HEALTH_THRESHOLDS = {
  // Recovery thresholds
  RECOVERY_GREEN: 75,
  RECOVERY_YELLOW: 55,
  RECOVERY_HIGH_STRAIN_ALERT: 70,
  RECOVERY_LIMITER: 65,
  RECOVERY_PLAN_LOW: 50,
  RECOVERY_MEDICAL_ALERT: 40,

  // Readiness thresholds
  READINESS_GREEN: 70,
  READINESS_YELLOW: 50,
  READINESS_PLAN_LOW: 60,
  READINESS_SUCCESS: 75,

  // Sleep (h): jedna definicja „krótkiej nocy” i „ostrzeżenia” dla całej aplikacji (docs/SINGLE_SOURCE.md)
  SLEEP_SHORT_H: 6,
  SLEEP_WARNING_H: 6.5,
};

/** Dzień jedzenia poniżej tej liczby kcal to prawie na pewno niepełny zapis (np. wpisany dopiero wieczorem). */
export const MIN_FULL_DAY_KCAL = 1000;

export function recoveryTier(score: number): 'green' | 'yellow' | 'red' {
  if (score >= HEALTH_THRESHOLDS.RECOVERY_GREEN) return 'green';
  if (score < HEALTH_THRESHOLDS.RECOVERY_YELLOW) return 'red';
  return 'yellow';
}

export function readinessTier(score: number): 'green' | 'yellow' | 'red' {
  if (score >= HEALTH_THRESHOLDS.READINESS_GREEN) return 'green';
  if (score < HEALTH_THRESHOLDS.READINESS_YELLOW) return 'red';
  return 'yellow';
}
