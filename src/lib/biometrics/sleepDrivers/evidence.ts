import type { EffectDirection, EvidenceStrength, SleepOutcomeId } from './types';

/**
 * Progi siły dowodu. Silnik sprawdza kilkadziesiąt par (czynnik × wynik), więc przy pojedynczym
 * progu p<0.01 jedna fałszywa „zależność” trafia się przypadkiem. Dlatego progi są ostrzejsze:
 * confirmed p<0.001 (≈ poprawka Bonferroniego na ~50 testów), probable p<0.01, tentative p<0.05.
 * Słabe wzorce bez istotności odpadają (insufficient), a nie dostają etykiety „wstępne”.
 */
export function classifyEvidence(n: number, rho: number | null, pValue: number | null): EvidenceStrength {
  if (rho == null || pValue == null) return 'insufficient';
  const abs = Math.abs(rho);
  if (n >= 30 && pValue < 0.001 && abs >= 0.3) return 'confirmed';
  if (n >= 15 && pValue < 0.01 && abs >= 0.25) return 'probable';
  if (n >= 8 && pValue < 0.05 && abs >= 0.3) return 'tentative';
  return 'insufficient';
}

const STRENGTH_RANK: Record<EvidenceStrength, number> = {
  confirmed: 3,
  probable: 2,
  tentative: 1,
  insufficient: 0,
};

export function strengthRank(strength: EvidenceStrength): number {
  return STRENGTH_RANK[strength];
}

/** Wyższa latencja = gorzej; pozostałe wyniki: wyżej = lepiej. */
export function isHigherBetter(outcome: SleepOutcomeId): boolean {
  return outcome !== 'sleep_latency_min';
}

/**
 * Kierunek: czy WZROST wartości predyktora (dłuższy odstęp, więcej minut) idzie w parze
 * z lepszym wynikiem. Przy |rho| < 0.1 nie rozstrzygamy.
 */
export function effectDirection(rho: number | null, higherBetter: boolean): EffectDirection {
  if (rho == null || Math.abs(rho) < 0.1) return 'unclear';
  const outcomeRises = rho > 0;
  return outcomeRises === higherBetter ? 'helps' : 'hurts';
}
