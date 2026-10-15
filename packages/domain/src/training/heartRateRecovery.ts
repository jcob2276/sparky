export type HeartRateRecoveryCategory = 'excellent' | 'good' | 'fair' | 'poor' | 'insufficient_data';

export interface HeartRateRecoveryInput {
  /** Peak heart rate during the workout or at completion (bpm) */
  peakHeartRate: number;
  /** Heart rate 60 seconds post-workout (bpm) */
  heartRateAt60s?: number | null;
  /** Heart rate 120 seconds post-workout (bpm) */
  heartRateAt120s?: number | null;
}

export interface HeartRateRecoveryResult {
  hasValidData: boolean;
  peakHeartRate: number;
  hrDrop60s: number | null;
  hrDrop120s: number | null;
  category: HeartRateRecoveryCategory;
  categoryLabel: string;
  recommendation: string;
  isAutonomicFatigued: boolean;
}

/**
 * Evaluates Heart Rate Recovery (HRR) post-workout.
 * Bevel / ACSM Clinical standards:
 * - 60s drop >= 30 bpm: Excellent parasympathetic reactivation
 * - 60s drop 20 - 29 bpm: Good cardiovascular recovery
 * - 60s drop 13 - 19 bpm: Fair recovery
 * - 60s drop < 12 bpm: Poor / high cardiac strain (autonomic fatigue)
 */
export function calculateHeartRateRecovery(input?: HeartRateRecoveryInput | null): HeartRateRecoveryResult {
  if (!input) {
    return {
      hasValidData: false,
      peakHeartRate: 0,
      hrDrop60s: null,
      hrDrop120s: null,
      category: 'insufficient_data',
      categoryLabel: 'Brak danych o wyciszeniu',
      recommendation: 'Zarejestruj tętno 1 lub 2 minuty po zakończeniu aktywności, aby ocenić reaktywację przywspółczulną.',
      isAutonomicFatigued: false,
    };
  }

  const peak = Math.round(input.peakHeartRate || 0);
  const hr60 = typeof input.heartRateAt60s === 'number' && Number.isFinite(input.heartRateAt60s) && input.heartRateAt60s > 0
    ? Math.round(input.heartRateAt60s)
    : null;
  const hr120 = typeof input.heartRateAt120s === 'number' && Number.isFinite(input.heartRateAt120s) && input.heartRateAt120s > 0
    ? Math.round(input.heartRateAt120s)
    : null;

  if (!Number.isFinite(peak) || peak <= 60 || peak > 240 || (hr60 === null && hr120 === null)) {
    return {
      hasValidData: false,
      peakHeartRate: peak || 0,
      hrDrop60s: null,
      hrDrop120s: null,
      category: 'insufficient_data',
      categoryLabel: 'Brak danych o wyciszeniu',
      recommendation: 'Zarejestruj tętno 1 lub 2 minuty po zakończeniu aktywności, aby ocenić reaktywację przywspółczulną.',
      isAutonomicFatigued: false,
    };
  }

  const drop60 = hr60 !== null ? Math.max(0, peak - hr60) : null;
  const drop120 = hr120 !== null ? Math.max(0, peak - hr120) : null;

  let category: HeartRateRecoveryCategory = 'fair';
  let categoryLabel = 'Umiarkowane wyciszenie';
  let recommendation = 'Tętno opada w zadowalającym tempie. Utrzymuj umiarkowaną rozgrzewkę schładzającą (cool-down).';
  let isAutonomicFatigued = false;

  const primaryDrop = drop60 !== null ? drop60 : (drop120 !== null ? Math.round(drop120 * 0.6) : 0);

  if (primaryDrop >= 30) {
    category = 'excellent';
    categoryLabel = 'Świetna regeneracja serca';
    recommendation = 'Układ przywspółczulny błyskawicznie przejmuje kontrolę. Wysoka adaptacja tlenowa i brak zmęczenia autonomicznego.';
  } else if (primaryDrop >= 20) {
    category = 'good';
    categoryLabel = 'Dobra regeneracja serca';
    recommendation = 'Prawidłowy spadek tętna po wysiłku. Układ krążenia wraca do stanu spoczynkowego bez opóźnień.';
  } else if (primaryDrop >= 13) {
    category = 'fair';
    categoryLabel = 'Umiarkowane wyciszenie';
    recommendation = 'Tętno opada z lekkim oporem. Zadbaj o prawidłowe nawodnienie i wydłuż fazę schłodzenia po treningu.';
  } else {
    category = 'poor';
    categoryLabel = 'Opóźnione wyciszenie serca';
    recommendation = 'Spadek tętna poniżej 12 bpm w 60s wskazuje na przeciążenie układu autonomicznego, odwodnienie lub narastający dług regeneracyjny.';
    isAutonomicFatigued = true;
  }

  return {
    hasValidData: true,
    peakHeartRate: peak,
    hrDrop60s: drop60,
    hrDrop120s: drop120,
    category,
    categoryLabel,
    recommendation,
    isAutonomicFatigued,
  };
}
