/**
 * @file sleepConsistency.ts
 * @role Obliczenia regularności snu (Sleep Regularity / Consistency Score) oraz dżetlagu społecznego
 * (Social Jetlag) w stylu Bevel Health / Till Roenneberg.
 * Monitoruje zmienność pory zasypiania i budzenia oraz przesunięcie środka snu w dni wolne.
 */

export interface DailySleepRecord {
  date: string;          // YYYY-MM-DD
  bedtime: string;       // "HH:MM" lub ISO string
  wakeTime: string;      // "HH:MM" lub ISO string
  durationMinutes?: number;
  isFreeDay?: boolean;   // true = weekend / dzień wolny, false = dzień roboczy
}

export type ConsistencyRating = 'optimal' | 'good' | 'fair' | 'irregular';

export interface SleepConsistencyResult {
  consistencyScore: number;        // 0-100%
  rating: ConsistencyRating;
  averageBedtime: string;          // "HH:MM"
  averageWakeTime: string;         // "HH:MM"
  bedtimeStdDevMinutes: number;    // Odchylenie standardowe pory pójścia spać (np. ±25 min)
  wakeStdDevMinutes: number;       // Odchylenie standardowe pory pobudki (np. ±20 min)
  socialJetlagMinutes: number;     // Różnica środka snu (MidSleep) dni robocze vs wolne
  socialJetlagHours: number;       // W godzinach (np. 1.2h)
  workdayMidSleep: string | null;  // "HH:MM"
  freeDayMidSleep: string | null;  // "HH:MM"
  hasMeaningfulSocialJetlag: boolean; // true jeśli > 60 min (ryzyko metaboliczne / poniedziałkowe)
  recommendation: string;
}

/**
 * Konwertuje "HH:MM" lub ISO do minut po godzinie 12:00 w południe,
 * aby uniknąć problemu przejścia przez północ (23:30 vs 00:30).
 * 12:00 -> 0 min, 23:00 -> 660 min, 00:30 -> 750 min, 03:00 -> 900 min.
 */
export function timeToBedtimeMinutes(timeStr: string): number {
  const [h, m] = parseHourMinute(timeStr);
  let totalMinutes = h * 60 + m;
  // Jeśli godzina jest przed 12:00 (np. 00:30, 01:00), traktujemy jako noc po 24:00
  if (h < 12) {
    totalMinutes += 24 * 60;
  }
  return totalMinutes - 12 * 60;
}

/**
 * Konwertuje minuty po 12:00 w południe z powrotem do formatu "HH:MM".
 */
export function bedtimeMinutesToTime(minutesFromNoon: number): string {
  let totalMinutes = (minutesFromNoon + 12 * 60) % (24 * 60);
  if (totalMinutes < 0) totalMinutes += 24 * 60;
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Konwertuje "HH:MM" poranka do minut od północy (00:00).
 */
export function timeToWakeMinutes(timeStr: string): number {
  const [h, m] = parseHourMinute(timeStr);
  return h * 60 + m;
}

/**
 * Konwertuje minuty od północy do "HH:MM".
 */
export function wakeMinutesToTime(minutesFromMidnight: number): string {
  let totalMinutes = minutesFromMidnight % (24 * 60);
  if (totalMinutes < 0) totalMinutes += 24 * 60;
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function parseHourMinute(timeStr: string): [number, number] {
  if (timeStr.includes('T')) {
    const d = new Date(timeStr);
    return [d.getHours(), d.getMinutes()];
  }
  const [h, m] = timeStr.split(':').map(Number);
  return [Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0];
}

function isWeekend(dateStr: string): boolean {
  // YYYY-MM-DD
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay(); // 0 = niedziela, 6 = sobota
  return day === 0 || day === 6;
}

function standardDeviation(values: number[]): number {
  if (values.length <= 1) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Główna funkcja kalkulacji regularności snu i Social Jetlagu na podstawie historii nocy.
 */
export function calculateSleepConsistency(records: DailySleepRecord[]): SleepConsistencyResult {
  if (!records || records.length === 0) {
    return {
      consistencyScore: 0,
      rating: 'irregular',
      averageBedtime: '--:--',
      averageWakeTime: '--:--',
      bedtimeStdDevMinutes: 0,
      wakeStdDevMinutes: 0,
      socialJetlagMinutes: 0,
      socialJetlagHours: 0,
      workdayMidSleep: null,
      freeDayMidSleep: null,
      hasMeaningfulSocialJetlag: false,
      recommendation: 'Brak wystarczającej liczby nocy do analizy regularności snu.',
    };
  }

  const bedMinutesList: number[] = [];
  const wakeMinutesList: number[] = [];
  const workdayMidSleeps: number[] = [];
  const freeDayMidSleeps: number[] = [];

  for (const r of records) {
    const bedFromNoon = timeToBedtimeMinutes(r.bedtime);
    const wakeFromMid = timeToWakeMinutes(r.wakeTime);
    bedMinutesList.push(bedFromNoon);
    wakeMinutesList.push(wakeFromMid);

    // Oblicz środek snu (MidSleep) jako bezwzględne minuty od południa
    // Pora pobudki w minutach od południa: wakeFromMid + 12*60
    const wakeFromNoon = wakeFromMid + 12 * 60;
    const midSleepFromNoon = (bedFromNoon + wakeFromNoon) / 2;

    const free = r.isFreeDay !== undefined ? r.isFreeDay : isWeekend(r.date);
    if (free) {
      freeDayMidSleeps.push(midSleepFromNoon);
    } else {
      workdayMidSleeps.push(midSleepFromNoon);
    }
  }

  // Średnie i odchylenia
  const avgBedNoon = bedMinutesList.reduce((s, v) => s + v, 0) / bedMinutesList.length;
  const avgWakeMid = wakeMinutesList.reduce((s, v) => s + v, 0) / wakeMinutesList.length;

  const bedStdDev = Math.round(standardDeviation(bedMinutesList));
  const wakeStdDev = Math.round(standardDeviation(wakeMinutesList));

  // Regularity score (0-100)
  // Odchylenie 0-20 min -> 95-100%
  // Suma odchyleń bed + wake: 0-30 min -> 100%, każde dodatkowe 10 min odejmuje 5 pkt
  const totalVariance = bedStdDev + wakeStdDev;
  const rawScore = Math.max(0, Math.min(100, Math.round(100 - Math.max(0, totalVariance - 30) * 0.75)));

  let rating: ConsistencyRating = 'optimal';
  if (rawScore < 60) rating = 'irregular';
  else if (rawScore < 75) rating = 'fair';
  else if (rawScore < 90) rating = 'good';

  // Social Jetlag
  let socialJetlagMinutes = 0;
  let workdayMidStr: string | null = null;
  let freeDayMidStr: string | null = null;

  if (workdayMidSleeps.length > 0 && freeDayMidSleeps.length > 0) {
    const avgWorkMid = workdayMidSleeps.reduce((s, v) => s + v, 0) / workdayMidSleeps.length;
    const avgFreeMid = freeDayMidSleeps.reduce((s, v) => s + v, 0) / freeDayMidSleeps.length;

    socialJetlagMinutes = Math.round(Math.abs(avgFreeMid - avgWorkMid));
    workdayMidStr = bedtimeMinutesToTime(avgWorkMid);
    freeDayMidStr = bedtimeMinutesToTime(avgFreeMid);
  }

  const socialJetlagHours = Math.round((socialJetlagMinutes / 60) * 10) / 10;
  const hasMeaningfulSocialJetlag = socialJetlagMinutes >= 60;

  // Rekomendacja
  let recommendation = 'Wzorcowa synchronizacja okołodobowa. Pory snu są spójne w tygodniu i w weekend.';
  if (hasMeaningfulSocialJetlag) {
    recommendation = `Zidentyfikowano Social Jetlag (${socialJetlagHours}h). Późniejsze wstawanie w weekend rozregulowuje zegar biologiczny i potęguje zmęczenie w poniedziałki. Postaraj się zbliżyć porę pobudki w weekend do dni roboczych (maks. ±45 min).`;
  } else if (totalVariance > 90) {
    recommendation = `Wysoka zmienność pory snu (zasypianie ±${bedStdDev} min, budzenie ±${wakeStdDev} min). Ustabilizowanie stałej pory pobudki poprawi jakość fazy Deep i energię w ciągu dnia.`;
  } else if (rating === 'good' || rating === 'fair') {
    recommendation = `Dobra regularność (zmienność ±${bedStdDev} min). Dążenie do stałego okna snu wspiera wyrzut melatoniny i regenerację.`;
  }

  return {
    consistencyScore: rawScore,
    rating,
    averageBedtime: bedtimeMinutesToTime(avgBedNoon),
    averageWakeTime: wakeMinutesToTime(avgWakeMid),
    bedtimeStdDevMinutes: bedStdDev,
    wakeStdDevMinutes: wakeStdDev,
    socialJetlagMinutes,
    socialJetlagHours,
    workdayMidSleep: workdayMidStr,
    freeDayMidSleep: freeDayMidStr,
    hasMeaningfulSocialJetlag,
    recommendation,
  };
}
