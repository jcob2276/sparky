/**
 * @file sleepBank.ts
 * @role Obliczenia Banku Snu (Sleep Bank) oraz trajektorii spłaty długu snu (Sleep Debt Payback)
 * w stylu Bevel Health. Monitoruje skumulowany bilans snu z ostatnich 14 dni, uwzględnia
 * drzemki regeneracyjne oraz oblicza optymalny czas wydłużenia snu bez zaburzania rytmu okołodobowego.
 */

export interface SleepBankDayInput {
  date: string;                   // YYYY-MM-DD
  sleepDurationMinutes: number;   // Rzeczywisty czas snu (bez wybudzeń)
  sleepNeedMinutes: number;       // Zapotrzebowanie na sen tego dnia (np. 480 min = 8h)
  napMinutes?: number | null;     // Czas drzemki w ciągu dnia (min)
}

export type SleepDebtStatus = 'well_rested' | 'mild_debt' | 'moderate_debt' | 'severe_debt';

export interface SleepBankResult {
  totalDebtMinutes: number;           // Ujemne = dług, dodatnie = nadwyżka
  totalDebtHours: number;             // np. -3.5h
  status: SleepDebtStatus;
  statusLabel: string;
  rolling14DaysAverageSleepMinutes: number;
  rolling14DaysAverageNeedMinutes: number;
  recommendedNightlyExtensionMinutes: number; // np. +35 min/noc
  estimatedDaysToFullPayback: number;
  recentDaysBreakdown: Array<{
    date: string;
    actualMinutes: number;
    needMinutes: number;
    balanceMinutes: number;
  }>;
  recommendation: string;
}

/**
 * Oblicza stan Banku Snu (Sleep Bank) na podstawie historii ostatnich nocy.
 */
export function calculateSleepBank(
  history: SleepBankDayInput[],
  windowDays = 14,
  targetPaybackDays = 5,
  maxNightlyExtension = 45
): SleepBankResult {
  if (!history || history.length === 0) {
    return {
      totalDebtMinutes: 0,
      totalDebtHours: 0,
      status: 'well_rested',
      statusLabel: 'Brak długu',
      rolling14DaysAverageSleepMinutes: 0,
      rolling14DaysAverageNeedMinutes: 0,
      recommendedNightlyExtensionMinutes: 0,
      estimatedDaysToFullPayback: 0,
      recentDaysBreakdown: [],
      recommendation: 'Brak zarejestrowanych nocy do analizy Banku Snu.',
    };
  }

  // Posortuj od najstarszego i weź ostatnie windowDays
  const sorted = [...history]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-windowDays);

  let totalDebtMinutes = 0;
  let totalSleep = 0;
  let totalNeed = 0;

  const recentDaysBreakdown = sorted.map((day) => {
    // Drzemki do 45 min dają 100% spłaty długu; powyżej 45 min mogą zaburzać sen nocny
    const effectiveNap = day.napMinutes && day.napMinutes > 0 ? Math.min(day.napMinutes, 45) : 0;
    const effectiveSleep = day.sleepDurationMinutes + effectiveNap;
    const balanceMinutes = effectiveSleep - day.sleepNeedMinutes;

    totalDebtMinutes += balanceMinutes;
    totalSleep += day.sleepDurationMinutes;
    totalNeed += day.sleepNeedMinutes;

    return {
      date: day.date,
      actualMinutes: day.sleepDurationMinutes,
      needMinutes: day.sleepNeedMinutes,
      balanceMinutes,
    };
  });

  const avgSleep = Math.round(totalSleep / sorted.length);
  const avgNeed = Math.round(totalNeed / sorted.length);
  const totalDebtHours = Math.round((totalDebtMinutes / 60) * 10) / 10;

  // Ustalenie statusu długu
  let status: SleepDebtStatus = 'well_rested';
  let statusLabel = 'Wypoczęty';

  if (totalDebtMinutes < -300) {
    status = 'severe_debt';
    statusLabel = 'Duży dług snu';
  } else if (totalDebtMinutes < -120) {
    status = 'moderate_debt';
    statusLabel = 'Umiarkowany dług';
  } else if (totalDebtMinutes < 0) {
    status = 'mild_debt';
    statusLabel = 'Lekki dług';
  } else {
    status = 'well_rested';
    statusLabel = totalDebtMinutes > 60 ? 'Nadwyżka snu' : 'Równowaga';
  }

  // Trajektoria spłaty długu:
  // Zgodnie z literaturą medycyny snu nie zaleca się wydłużania snu o więcej niż 45-60 min na raz,
  // by nie rozregulować rytmu dobowego.
  let recommendedNightlyExtensionMinutes = 0;
  let estimatedDaysToFullPayback = 0;

  if (totalDebtMinutes < 0) {
    const rawDebt = Math.abs(totalDebtMinutes);
    const neededPerNight = Math.ceil(rawDebt / targetPaybackDays);
    recommendedNightlyExtensionMinutes = Math.min(maxNightlyExtension, Math.max(15, neededPerNight));
    estimatedDaysToFullPayback = Math.ceil(rawDebt / recommendedNightlyExtensionMinutes);
  }

  // Rekomendacja
  let recommendation = 'Twój Bank Snu jest zrównoważony. Brak zaległości regeneracyjnych.';
  if (status === 'severe_debt') {
    recommendation = `Skumulowany dług snu wynosi ${Math.abs(totalDebtHours)}h. Aby bezpiecznie go spłacić bez rozregulowania zegara biologicznego, wydłuż sen o +${recommendedNightlyExtensionMinutes} min na noc przez najbliższe ${estimatedDaysToFullPayback} dni.`;
  } else if (status === 'moderate_debt') {
    recommendation = `Umiarkowany dług snu (${Math.abs(totalDebtHours)}h). Wydłużenie snu o +${recommendedNightlyExtensionMinutes} min przez ${estimatedDaysToFullPayback} dni pozwoli wrócić do pełnej gotowości.`;
  } else if (status === 'mild_debt') {
    recommendation = `Niewielki deficyt (${Math.abs(totalDebtHours)}h). Krótka drzemka (20 min) lub 15 min wcześniejsze położenie się spać w pełni zbilansuje bank.`;
  } else if (totalDebtMinutes > 60) {
    recommendation = `Dodatni bilans w Banku Snu (+${totalDebtHours}h). Wysoka rezerwa regeneracyjna przed intensywniejszymi dniami treningowymi.`;
  }

  return {
    totalDebtMinutes,
    totalDebtHours,
    status,
    statusLabel,
    rolling14DaysAverageSleepMinutes: avgSleep,
    rolling14DaysAverageNeedMinutes: avgNeed,
    recommendedNightlyExtensionMinutes,
    estimatedDaysToFullPayback,
    recentDaysBreakdown,
    recommendation,
  };
}
