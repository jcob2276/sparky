/**
 * @file caffeineCutoff.ts
 * @role Obliczenia okna kofeinowego (Caffeine Cutoff Timer), estymacji aktywnej kofeiny (half-life)
 * oraz dynamicznego bilansu energetycznego (Fueling Energy Target) w stylu Bevel Health / Matthew Walker.
 */

export interface CaffeineLogItem {
  amountMg: number;
  loggedAt: string; // ISO string
}

export type CaffeineStatus =
  | 'safe_window'        // Przed cutoffem, bezpieczne okno
  | 'approaching_cutoff' // Mniej niż 60 min do cutoffu
  | 'cutoff_passed'      // Po cutoffie, unikaj kofeiny
  | 'bedtime_warning';   // Przewidywane stężenie kofeiny w porze snu > 25 mg (zaburzenia fazy N3/Deep)

export interface CaffeineCutoffResult {
  targetBedtime: string; // e.g. "23:00"
  cutoffTime: string;    // e.g. "13:00"
  totalConsumedMg: number;
  activeCurrentMg: number;
  activeBedtimeMg: number;
  minutesUntilCutoff: number;
  status: CaffeineStatus;
  recommendation: string;
}

export interface DynamicFuelingInput {
  baseCalories: number;       // np. BMR + bazowy NEAT (np. 2000 kcal)
  activeBurnCalories: number; // Kalorie spalone z treningu / Strain (np. 600 kcal)
  consumedCalories: number;   // Zjedzone kalorie (np. 1800 kcal)
  goal?: 'cut' | 'maintain' | 'bulk';
}

export interface DynamicFuelingResult {
  dynamicTargetCalories: number;
  consumedCalories: number;
  remainingCalories: number;
  balanceCalories: number; // consumed - target (ujemny = deficyt, dodatni = nadwyżka)
  burnBreakdown: {
    base: number;
    active: number;
    totalExpenditure: number;
  };
  fuelingPercentage: number; // 0-100+%
}

/**
 * Oblicza godzinę cutoffu na podstawie godziny pójścia spać i godzin buforu (domyślnie 10h).
 * Np. bedtime "23:00", buffer 10h -> "13:00".
 * Bedtime "00:30", buffer 10h -> "14:30".
 */
export function calculateCutoffTime(targetBedtime: string, bufferHours = 10): string {
  let h = 23;
  let m = 0;
  if (targetBedtime && typeof targetBedtime === 'string') {
    const match = targetBedtime.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      h = Math.min(23, Math.max(0, parseInt(match[1], 10)));
      m = Math.min(59, Math.max(0, parseInt(match[2], 10)));
    }
  }

  let totalMinutes = h * 60 + m - bufferHours * 60;
  while (totalMinutes < 0) {
    totalMinutes += 24 * 60;
  }
  totalMinutes = totalMinutes % (24 * 60);

  const cutoffH = Math.floor(totalMinutes / 60);
  const cutoffM = totalMinutes % 60;

  return `${String(cutoffH).padStart(2, '0')}:${String(cutoffM).padStart(2, '0')}`;
}

export function getTargetBedtimeDate(now: Date, bHours: number, bMins: number): Date {
  const d = new Date(now);
  d.setHours(bHours, bMins, 0, 0);

  if (bHours >= 12) {
    // e.g. 23:00 - late night between 00:00 and 04:59 belongs to yesterday's scheduled sleep
    if (now.getHours() < 5) {
      d.setDate(d.getDate() - 1);
    }
  } else {
    // e.g. 01:00 AM - from 05:00 to 23:59, bedtime falls on tomorrow morning (the upcoming night)
    if (now.getHours() >= 5) {
      d.setDate(d.getDate() + 1);
    }
  }
  return d;
}

/**
 * Oblicza stan kofeinowy użytkownika:
 * - Half-life kofeiny wynosi średnio 5.5 godziny.
 * - Stężenie w czasie t: C(t) = C0 * (0.5)^((t - t0) / 5.5).
 */
export function calculateCaffeineCutoff(
  targetBedtime = '23:00',
  caffeineLogs: CaffeineLogItem[] = [],
  currentTimeIso?: string,
  bufferHours = 10,
  halfLifeHours = 5.5
): CaffeineCutoffResult {
  const now = currentTimeIso ? new Date(currentTimeIso) : new Date();

  const bedMatch = (targetBedtime || '').match(/(\d{1,2}):(\d{2})/);
  const bHours = bedMatch ? Math.min(23, Math.max(0, parseInt(bedMatch[1], 10))) : 23;
  const bMins = bedMatch ? Math.min(59, Math.max(0, parseInt(bedMatch[2], 10))) : 0;

  // Oblicz dokładny czas pójścia spać dla bieżącej sesji snu
  const bedtimeDate = getTargetBedtimeDate(now, bHours, bMins);
  const cutoffDate = new Date(bedtimeDate.getTime() - bufferHours * 60 * 60 * 1000);
  const minutesUntilCutoff = Math.round((cutoffDate.getTime() - now.getTime()) / (60 * 1000));
  const cutoffTime = calculateCutoffTime(targetBedtime, bufferHours);

  // Suma i stężenia aktywne
  const validLogs = (caffeineLogs || []).filter((item) => item && typeof item.amountMg === 'number' && item.amountMg > 0);
  const totalConsumedMg = Math.round(
    validLogs.reduce((sum, item) => sum + (item.amountMg || 0), 0)
  );

  let activeCurrentMg = 0;
  let activeBedtimeMg = 0;

  // Jeśli pora snu już minęła, poziom kofeiny przy pójściu spać to poziom bieżący
  const targetSleepTimestamp = Math.max(bedtimeDate.getTime(), now.getTime());

  for (const log of validLogs) {
    if (!log.loggedAt) continue;
    const logDate = new Date(log.loggedAt);
    if (isNaN(logDate.getTime())) continue;

    const hoursElapsed = (now.getTime() - logDate.getTime()) / (1000 * 60 * 60);
    const hoursToTargetSleep = (targetSleepTimestamp - logDate.getTime()) / (1000 * 60 * 60);

    if (hoursElapsed >= 0) {
      activeCurrentMg += log.amountMg * Math.pow(0.5, hoursElapsed / halfLifeHours);
    }
    if (hoursToTargetSleep >= 0) {
      activeBedtimeMg += log.amountMg * Math.pow(0.5, hoursToTargetSleep / halfLifeHours);
    }
  }

  activeCurrentMg = Math.round(activeCurrentMg * 10) / 10;
  activeBedtimeMg = Math.round(activeBedtimeMg * 10) / 10;

  // Ustal status
  let status: CaffeineStatus = 'safe_window';
  let recommendation = `Bezpieczne okno na kofeinę. Cutoff o ${cutoffTime}.`;

  if (activeBedtimeMg >= 25) {
    status = 'bedtime_warning';
    recommendation = `Wysoka kofeina o porze snu (~${activeBedtimeMg} mg). Może skrócić fazę snu głębokiego (N3).`;
  } else if (minutesUntilCutoff <= 0) {
    status = 'cutoff_passed';
    recommendation = `Cutoff minął o ${cutoffTime}. Zalecane napary bezkofeinowe i woda.`;
  } else if (minutesUntilCutoff <= 60) {
    status = 'approaching_cutoff';
    recommendation = `Ostatnie ${minutesUntilCutoff} min okna kofeinowego. Cutoff zbliża się o ${cutoffTime}.`;
  }

  return {
    targetBedtime,
    cutoffTime,
    totalConsumedMg,
    activeCurrentMg,
    activeBedtimeMg,
    minutesUntilCutoff,
    status,
    recommendation,
  };
}

function bedtoDate(d: Date, hours: number, minutes: number) {
  d.setHours(hours, minutes, 0, 0);
}

/**
 * Oblicza dynamiczne zapotrzebowanie kaloryczne (Fueling Target) uwzględniając
 * obciążenie treningowe (Strain / Active Burn) oraz cel diety.
 */
export function calculateDynamicFueling(input: DynamicFuelingInput): DynamicFuelingResult {
  const { baseCalories, activeBurnCalories, consumedCalories, goal = 'maintain' } = input;

  let goalAdjustment = 0;
  if (goal === 'cut') goalAdjustment = -300;
  if (goal === 'bulk') goalAdjustment = +250;

  const totalExpenditure = Math.round(baseCalories + activeBurnCalories);
  const dynamicTargetCalories = Math.max(1200, Math.round(baseCalories + activeBurnCalories + goalAdjustment));
  const remainingCalories = Math.round(dynamicTargetCalories - consumedCalories);
  const balanceCalories = Math.round(consumedCalories - dynamicTargetCalories);

  const fuelingPercentage = dynamicTargetCalories > 0
    ? Math.round((consumedCalories / dynamicTargetCalories) * 100)
    : 0;

  return {
    dynamicTargetCalories,
    consumedCalories,
    remainingCalories,
    balanceCalories,
    burnBreakdown: {
      base: baseCalories,
      active: activeBurnCalories,
      totalExpenditure,
    },
    fuelingPercentage,
  };
}
