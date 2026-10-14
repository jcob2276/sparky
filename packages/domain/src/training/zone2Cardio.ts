/**
 * @file zone2Cardio.ts
 * @role Akumulacja treningu w Strefie 2 (Zone 2 Cardio Tracker) w stylu Bevel Health / protokołu Petera Attii.
 * Monitoruje tygodniowy cel 150 minut w tlenie na bazie danych stref tętna z Garmina.
 */

import { shiftDateStr } from '../date.ts';

export interface Zone2ActivityInput {
  start_date?: string | null;
  icu_hr_zone_times?: unknown; // tablica sekund w strefach Z1-Z5
  gc_hr_zones?: unknown;
  moving_time?: number | null;
}

export interface Zone2DaySummary {
  dayName: string; // 'Pn', 'Wt', etc.
  dateStr: string; // YYYY-MM-DD
  minutesZ2: number;
}

export interface Zone2WeeklyResult {
  targetMinutes: number; // 150 min
  accumulatedMinutes: number;
  percentage: number; // 0 - 100%
  remainingMinutes: number;
  status: 'on_track' | 'needs_volume' | 'target_achieved';
  dailyBreakdown: Zone2DaySummary[];
  explanation: string;
}

const POLISH_DAYS = ['Ndz', 'Pn', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'];

export function computeZone2Weekly(
  activities: Zone2ActivityInput[] | null | undefined,
  asOfDateStr = '2026-10-14'
): Zone2WeeklyResult {
  const targetMinutes = 150;
  const safeDateStr = asOfDateStr.slice(0, 10);
  const asOf = new Date(`${safeDateStr}T12:00:00Z`);

  const dayOfWeek = asOf.getUTCDay(); // 0 = Sun, 1 = Mon...
  const distanceToMon = (dayOfWeek + 6) % 7;
  const mondayStr = shiftDateStr(safeDateStr, -distanceToMon);

  const days: Zone2DaySummary[] = [];
  for (let i = 0; i < 7; i++) {
    const dateStr = shiftDateStr(mondayStr, i);
    const d = new Date(`${dateStr}T12:00:00Z`);
    const dayName = POLISH_DAYS[d.getUTCDay()];
    days.push({ dayName, dateStr, minutesZ2: 0 });
  }

  let totalSecondsZ2 = 0;

  if (activities && activities.length > 0) {
    for (const act of activities) {
      if (!act.start_date) continue;
      const actDateStr = act.start_date.slice(0, 10);
      if (actDateStr < mondayStr) continue;

      const dayEntry = days.find((d) => d.dateStr === actDateStr);

      let z2Sec = 0;
      if (Array.isArray(act.icu_hr_zone_times) && act.icu_hr_zone_times.length >= 2) {
        z2Sec = Number(act.icu_hr_zone_times[1]) || 0;
      } else if (Array.isArray(act.gc_hr_zones) && act.gc_hr_zones.length >= 2) {
        z2Sec = Number(act.gc_hr_zones[1]) || 0;
      }

      totalSecondsZ2 += z2Sec;
      if (dayEntry) {
        dayEntry.minutesZ2 += Math.round(z2Sec / 60);
      }
    }
  }

  const accumulatedMinutes = Math.round(totalSecondsZ2 / 60);
  const percentage = Math.min(100, Math.round((accumulatedMinutes / targetMinutes) * 100));
  const remainingMinutes = Math.max(0, targetMinutes - accumulatedMinutes);

  let status: 'on_track' | 'needs_volume' | 'target_achieved' = 'needs_volume';
  let explanation = 'Budowanie bazy tlenowej. Zaplanuj spokojny bieg lub marsz w strefie konwersacyjnej.';

  if (accumulatedMinutes >= targetMinutes) {
    status = 'target_achieved';
    explanation = 'Tygodniowy cel Strefy 2 zrealizowany! Baza mitochondrialna i układ krążenia zostały optymalnie pobudzone.';
  } else if (percentage >= 50) {
    status = 'on_track';
    explanation = 'Dobre tempo realizacji bazy tlenowej. Pozostało jeszcze kilka spokojnych kilometrów do domknięcia celu.';
  }

  return {
    targetMinutes,
    accumulatedMinutes,
    percentage,
    remainingMinutes,
    status,
    dailyBreakdown: days,
    explanation,
  };
}
