import { warsawTimeOfDay } from './date.ts';
import type { DeviceSignalsDailyRow, OuraNightRow } from './deviceSignalsDaily.ts';

export interface PhoneSleepNight {
  date: string;
  bedtime: string;
  wake: string;
  minutes: number;
  steps: number;
  charging: boolean;
  confidence: 'high' | 'medium' | 'low';
}

export interface SleepSourceNight {
  date: string;
  phone: PhoneSleepNight;
  oura: { bedtime: string; wake: string; minutes: number } | null;
  /** phone minus Oura, in minutes (positive = phone says later). */
  bedDiffMin: number | null;
  wakeDiffMin: number | null;
}

export interface SleepSourceComparison {
  /** Newest first. */
  nights: SleepSourceNight[];
  /** Nights with a phone sleep window. */
  nPhone: number;
  /** Nights where both sources exist (the sample behind the agreement numbers). */
  nBoth: number;
  meanAbsBedDiffMin: number | null;
  meanAbsWakeDiffMin: number | null;
}

export function toPhoneSleepNight(row: DeviceSignalsDailyRow): PhoneSleepNight | null {
  if (!row.phoneSleepStart || !row.phoneSleepEnd || row.phoneSleepMin === null) return null;
  return {
    date: row.date,
    bedtime: warsawTimeOfDay(row.phoneSleepStart),
    wake: warsawTimeOfDay(row.phoneSleepEnd),
    minutes: row.phoneSleepMin,
    steps: row.phoneSleepSteps ?? 0,
    charging: row.phoneSleepCharging === true,
    confidence: row.phoneSleepConfidence ?? 'low',
  };
}

function diffMin(aIso: string, bIso: string): number {
  return Math.round((new Date(aIso).getTime() - new Date(bIso).getTime()) / 60_000);
}

function mean(values: number[]): number | null {
  return values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
}

/** Puts the phone-derived sleep window next to Oura for every night the phone produced one. */
export function compareSleepSources(
  daily: DeviceSignalsDailyRow[],
  oura: OuraNightRow[],
): SleepSourceComparison {
  const ouraByDate = new Map(oura.map((o) => [o.date, o]));
  const nights: SleepSourceNight[] = [];
  const bedDiffs: number[] = [];
  const wakeDiffs: number[] = [];
  for (const row of [...daily].sort((a, b) => b.date.localeCompare(a.date))) {
    const phone = toPhoneSleepNight(row);
    if (!phone || !row.phoneSleepStart || !row.phoneSleepEnd) continue;
    const o = ouraByDate.get(row.date);
    const ouraStart = o?.bedtimeStart ?? null;
    const ouraEnd = o?.bedtimeEnd ?? null;
    const bedDiff = ouraStart ? diffMin(row.phoneSleepStart, ouraStart) : null;
    const wakeDiff = ouraEnd ? diffMin(row.phoneSleepEnd, ouraEnd) : null;
    if (bedDiff !== null && wakeDiff !== null) {
      bedDiffs.push(Math.abs(bedDiff));
      wakeDiffs.push(Math.abs(wakeDiff));
    }
    nights.push({
      date: row.date,
      phone,
      oura:
        o && ouraStart && ouraEnd
          ? {
              bedtime: warsawTimeOfDay(ouraStart),
              wake: warsawTimeOfDay(ouraEnd),
              minutes: Math.round((o.totalSleepHours ?? 0) * 60),
            }
          : null,
      bedDiffMin: bedDiff,
      wakeDiffMin: wakeDiff,
    });
  }
  return {
    nights,
    nPhone: nights.length,
    nBoth: bedDiffs.length,
    meanAbsBedDiffMin: mean(bedDiffs),
    meanAbsWakeDiffMin: mean(wakeDiffs),
  };
}
