/**
 * @file cardioDrift.ts
 * @role Obliczenia dryfu tętna i rozprzężenia tlenowego (Cardiovascular Drift / Aerobic Decoupling - Pa:Hr)
 * w stylu Bevel Health / Joe Friela.
 * Analizuje stosunek tempa/prędkości do tętna w pierwszej vs drugiej połowie biegu/sesji kardio.
 */

export interface CardioSplitInput {
  half1SpeedMps: number;  // Prędkość w pierwszej połowie (m/s)
  half1AvgHr: number;     // Średnie tętno pierwszej połowy (bpm)
  half2SpeedMps: number;  // Prędkość w drugiej połowie (m/s)
  half2AvgHr: number;     // Średnie tętno drugiej połowy (bpm)
}

export type DecouplingRating = 'optimal_coupling' | 'mild_drift' | 'aerobic_decoupling';

export interface CardioDriftResult {
  decouplingPercentage: number;   // np. 3.4% lub 6.8%
  efHalf1: number;                // Efficiency Factor połowa 1 (m/s na bpm)
  efHalf2: number;                // Efficiency Factor połowa 2
  rating: DecouplingRating;
  ratingLabel: string;
  hasSignificantDrift: boolean;   // true jeśli decoupling > 5.0%
  hrDeltaBpm: number;             // Różnica tętna między połówkami
  recommendation: string;
}

/**
 * Oblicza wskaźnik Aerobic Decoupling (Rozprzężenie tlenowe / Dryf tętna).
 * Decoupling = ((EF1 - EF2) / EF1) * 100%
 * gdzie EF = Prędkość (m/s) / Tętno (bpm)
 */
export function calculateCardioDrift(input: CardioSplitInput): CardioDriftResult {
  const { half1SpeedMps, half1AvgHr, half2SpeedMps, half2AvgHr } = input;

  if (half1SpeedMps <= 0 || half1AvgHr <= 0 || half2SpeedMps <= 0 || half2AvgHr <= 0) {
    return {
      decouplingPercentage: 0,
      efHalf1: 0,
      efHalf2: 0,
      rating: 'optimal_coupling',
      ratingLabel: 'Brak danych',
      hasSignificantDrift: false,
      hrDeltaBpm: 0,
      recommendation: 'Brak wystarczających danych telemetrycznych do analizy dryfu tętna.',
    };
  }

  const ef1 = half1SpeedMps / half1AvgHr;
  const ef2 = half2SpeedMps / half2AvgHr;

  const rawDecoupling = ((ef1 - ef2) / ef1) * 100;
  const decouplingPercentage = Math.round(rawDecoupling * 10) / 10;
  const hrDeltaBpm = Math.round(half2AvgHr - half1AvgHr);

  const hasSignificantDrift = decouplingPercentage > 5.0;

  let rating: DecouplingRating = 'optimal_coupling';
  let ratingLabel = 'Pełne sprzężenie (< 3.5%)';

  if (hasSignificantDrift) {
    rating = 'aerobic_decoupling';
    ratingLabel = 'Dryf tętna (> 5.0%)';
  } else if (decouplingPercentage >= 3.5) {
    rating = 'mild_drift';
    ratingLabel = 'Umiarkowany dryf (3.5% - 5.0%)';
  }

  let recommendation = 'Wzorcowa baza tlenowa. Współczynnik tempo/tętno pozostał stabilny przez cały bieg.';
  if (hasSignificantDrift) {
    recommendation = `Zidentyfikowano dryf tętna (${decouplingPercentage}%). W drugiej połowie serce pracowało z wyższym tętnem (+${hrDeltaBpm} bpm) dla utrzymania tej samej prędkości. Typowe przyczyny: ubytek płynów (odwodnienie), przegrzanie lub niedostateczna objętość bazy tlenowej (Zone 2).`;
  } else if (rating === 'mild_drift') {
    recommendation = `Lekki dryf tętna (${decouplingPercentage}%). Naturalna adaptacja w normie fizjologicznej.`;
  }

  return {
    decouplingPercentage,
    efHalf1: Math.round(ef1 * 10000) / 10000,
    efHalf2: Math.round(ef2 * 10000) / 10000,
    rating,
    ratingLabel,
    hasSignificantDrift,
    hrDeltaBpm,
    recommendation,
  };
}
