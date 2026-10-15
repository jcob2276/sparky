/**
 * @file hydration.ts
 * @role Obliczenia dynamicznego nawodnienia (Hydration & Sweat Loss Compensation) w stylu Bevel Health / ACSM.
 * Dynamicznie powiększa bazowy cel płynów o utratę potu z treningu (aktywne kalorie i czas trwania)
 * oraz generuje rekomendacje elektrolitowe.
 */

export interface HydrationInput {
  baseTargetMl?: number;             // Domyślnie 2500 ml
  loggedIntakeMl: number;            // Wypita woda i płyny dzisiaj (ml)
  activeCalories?: number | null;    // Spalone kalorie z treningu
  workoutDurationMinutes?: number | null; // Czas trwania treningu (min)
}

export type HydrationStatus = 'optimal' | 'on_track' | 'behind' | 'dehydration_risk';

export interface HydrationResult {
  baseTargetMl: number;
  sweatLossMl: number;
  dynamicTargetMl: number;
  loggedIntakeMl: number;
  remainingMl: number;
  percentage: number;                // 0-100+%
  status: HydrationStatus;
  statusLabel: string;
  needsElectrolytes: boolean;        // true jeśli ubytek potu > 750 ml
  electrolyteAdvisory: string | null;
  recommendation: string;
}

/**
 * Szacuje ubytek płynów (potu) na podstawie aktywnych kalorii i czasu trwania sesji (wg wytycznych ACSM).
 */
export function estimateSweatLossMl(
  activeCalories = 0,
  workoutDurationMinutes = 0
): number {
  if (activeCalories <= 0 && workoutDurationMinutes <= 0) return 0;

  // Średnio 0.9 ml potu na każdą aktywną kilokalorię + bufor za czas trwania
  const calorieLoss = activeCalories * 0.9;
  const timeLoss = (workoutDurationMinutes / 60) * 150;

  const totalSweatLoss = Math.round(calorieLoss + timeLoss);
  return Math.max(0, totalSweatLoss);
}

/**
 * Oblicza dynamiczne zapotrzebowanie na płyny z kompensacją potu.
 */
export function calculateDynamicHydration(input?: HydrationInput | null): HydrationResult {
  const baseTargetMl = Math.max(1000, Number(input?.baseTargetMl) || 2500);
  const activeCalories = Math.max(0, Number(input?.activeCalories) || 0);
  const workoutDurationMinutes = Math.max(0, Number(input?.workoutDurationMinutes) || 0);
  const loggedIntakeMl = Math.max(0, Number(input?.loggedIntakeMl) || 0);

  const sweatLossMl = estimateSweatLossMl(activeCalories, workoutDurationMinutes);
  const dynamicTargetMl = baseTargetMl + sweatLossMl;
  const remainingMl = Math.max(0, dynamicTargetMl - loggedIntakeMl);
  const percentage = dynamicTargetMl > 0 ? Math.round((loggedIntakeMl / dynamicTargetMl) * 100) : 0;

  const needsElectrolytes = sweatLossMl >= 750 || workoutDurationMinutes >= 75;

  let status: HydrationStatus = 'behind';
  let statusLabel = 'Wymaga uzupełnienia';

  if (sweatLossMl >= 800 && loggedIntakeMl < 1200) {
    status = 'dehydration_risk';
    statusLabel = 'Ryzyko odwodnienia';
  } else if (percentage >= 95) {
    status = 'optimal';
    statusLabel = 'Optymalne nawodnienie';
  } else if (percentage >= 60) {
    status = 'on_track';
    statusLabel = 'W normie';
  }

  let electrolyteAdvisory: string | null = null;
  if (needsElectrolytes) {
    electrolyteAdvisory = `Wysoki ubytek potu (~${sweatLossMl} ml). Zalecana suplementacja sodu (400-600 mg) i potasu dla utrzymania objętości osocza krwi.`;
  }

  let recommendation = `Zrealizowano ${percentage}% dziennego celu (${loggedIntakeMl}/${dynamicTargetMl} ml).`;
  if (status === 'dehydration_risk') {
    recommendation = `Wysokie obciążenie treningowe przy niskiej podaży płynów. Uzupełnij ${remainingMl} ml wody z elektrolitami, aby zapobiec spadkowi HRV i skurczom.`;
  } else if (status === 'optimal') {
    recommendation = `Świetny bilans płynów (${loggedIntakeMl} ml). Osiągnięto cel z pełną kompensacją strat potreningowych.`;
  } else if (remainingMl > 0) {
    recommendation = `Pozostało ${remainingMl} ml do wypicia. Baza: ${baseTargetMl} ml + kompensacja potu: +${sweatLossMl} ml.`;
  }

  return {
    baseTargetMl,
    sweatLossMl,
    dynamicTargetMl,
    loggedIntakeMl,
    remainingMl,
    percentage,
    status,
    statusLabel,
    needsElectrolytes,
    electrolyteAdvisory,
    recommendation,
  };
}
