/**
 * @file sleepNeed.ts
 * @role Dynamiczne zapotrzebowanie na sen (Sleep Need Calculator) adaptowane z modelu Bevel / Whoop.
 * Łączy bazowe zapotrzebowanie na sen, dzisiejszy wydatek obciążenia (Strain),
 * spłatę długu sennego (Sleep Debt) oraz korektę o drzemki w ciągu dnia.
 */

export interface SleepNeedInput {
  baselineMinutes?: number | null | undefined; // domyślnie 465m (7h 45m)
  strainScore?: number | null | undefined; // 0 - 21
  sleepDebtHours?: number | null | undefined; // z modelu rolling 14-night
  napMinutes?: number | null | undefined; // drzemka w ciągu dnia
}

export interface SleepNeedResult {
  baselineMinutes: number;
  strainExtraMinutes: number;
  debtExtraMinutes: number;
  napCreditMinutes: number;
  targetSleepMinutes: number;
  targetSleepFormatted: string; // np. "8h 15m"
  baselineFormatted: string;
  explanation: string;
}

export function formatMinutesToHoursMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function computeSleepNeed(input: SleepNeedInput): SleepNeedResult {
  // Bazowe zapotrzebowanie (default: 7h 45m = 465 min)
  const baselineMinutes = typeof input.baselineMinutes === 'number' && input.baselineMinutes > 300 && input.baselineMinutes < 600
    ? Math.round(input.baselineMinutes)
    : 465;

  // Dodatkowy sen wynikający ze Strainu (aktywności)
  // Obciążenie poniżej 8 nie wymaga dodatkowego snu; powyżej 8 każdy punkt dodaje ~3.5 min, max +45 min
  const strain = typeof input.strainScore === 'number' && Number.isFinite(input.strainScore)
    ? Math.max(0, Math.min(21, input.strainScore))
    : 0;
  const strainExtraMinutes = strain > 8
    ? Math.min(45, Math.round((strain - 8) * 3.5))
    : 0;

  // Dodatkowy sen na spłatę długu sennego
  // Spłacamy maksymalnie 30-40 min długu na noc (nie da się spłacić 3h długu jednej nocy)
  const debtH = typeof input.sleepDebtHours === 'number' && Number.isFinite(input.sleepDebtHours)
    ? Math.max(0, input.sleepDebtHours)
    : 0;
  const debtExtraMinutes = Math.min(45, Math.round(debtH * 25));

  // Kredyt za drzemkę w ciągu dnia
  const nap = typeof input.napMinutes === 'number' && Number.isFinite(input.napMinutes)
    ? Math.max(0, input.napMinutes)
    : 0;
  const napCreditMinutes = Math.min(45, Math.round(nap * 0.75)); // drzemka w 75% redukuje potrzebę nocną

  // Docelowy czas snu (ograniczony od 6h do 10h)
  const targetSleepMinutes = Math.max(
    360,
    Math.min(600, baselineMinutes + strainExtraMinutes + debtExtraMinutes - napCreditMinutes)
  );

  let explanation = 'Standardowe zapotrzebowanie na sen.';
  if (strainExtraMinutes > 20 && debtExtraMinutes > 20) {
    explanation = 'Wysokie obciążenie i narosły dług senny. Zaplanuj dłuższy sen dla pełnej regeneracji.';
  } else if (strainExtraMinutes > 15) {
    explanation = 'Dodatkowy czas snu wspomoże adaptację po dzisiejszym mocniejszym wysiłku.';
  } else if (debtExtraMinutes > 15) {
    explanation = 'Zwiększ czas w łóżku, aby stopniowo zredukować dług senny z ostatnich nocy.';
  } else if (napCreditMinutes > 15) {
    explanation = 'Drzemka w ciągu dnia częściowo zredukowała nocne zapotrzebowanie na sen.';
  }

  return {
    baselineMinutes,
    strainExtraMinutes,
    debtExtraMinutes,
    napCreditMinutes,
    targetSleepMinutes,
    targetSleepFormatted: formatMinutesToHoursMinutes(targetSleepMinutes),
    baselineFormatted: formatMinutesToHoursMinutes(baselineMinutes),
    explanation,
  };
}
