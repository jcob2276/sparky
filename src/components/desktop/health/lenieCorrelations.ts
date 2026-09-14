import type { LenieLogRow, PhoneUsageRow } from '../../../lib/desktopDashboardTypes';
import type { OuraRow } from '../desktopUtils';

export interface LenieCorrelationsResult {
  sleepCorrelationText: string | null;
  phoneCorrelationText: string | null;
  riskWindowAlert: string | null;
}

export function computeLenieCorrelations(
  logs: LenieLogRow[] = [],
  phoneUsage: PhoneUsageRow[] = [],
  oura: OuraRow[] = [],
): LenieCorrelationsResult {
  if (!logs.length) {
    return {
      sleepCorrelationText: null,
      phoneCorrelationText: null,
      riskWindowAlert: null,
    };
  }

  // 1. Sleep correlation: compare incident dates with Oura sleep duration
  const ouraMap = new Map<string, OuraRow>();
  for (const o of oura) {
    if (o.date) ouraMap.set(o.date, o);
  }

  let logsWithSleep = 0;
  let logsWithLowSleep = 0;

  for (const l of logs.slice(0, 20)) {
    const o = ouraMap.get(l.date);
    if (o && o.total_sleep_hours != null) {
      logsWithSleep++;
      if (o.total_sleep_hours < 6.5 || (o.readiness_score && o.readiness_score < 70)) {
        logsWithLowSleep++;
      }
    }
  }

  let sleepCorrelationText: string | null = null;
  if (logsWithSleep >= 3) {
    const pct = Math.round((logsWithLowSleep / logsWithSleep) * 100);
    if (pct >= 50) {
      sleepCorrelationText = `${pct}% incydentów po nocy ze snem <6.5h lub niskim Readiness`;
    }
  }

  // 2. Late night phone usage correlation
  const phoneMap = new Map<string, PhoneUsageRow>();
  for (const p of phoneUsage) {
    if (p.date) phoneMap.set(p.date, p);
  }

  let logsWithPhone = 0;
  let logsWithLateScreen = 0;

  for (const l of logs.slice(0, 20)) {
    const p = phoneMap.get(l.date);
    if (p) {
      logsWithPhone++;
      if (p.late_night_minutes > 25) {
        logsWithLateScreen++;
      }
    }
  }

  let phoneCorrelationText: string | null = null;
  if (logsWithPhone >= 3) {
    const pct = Math.round((logsWithLateScreen / logsWithPhone) * 100);
    if (pct >= 50) {
      phoneCorrelationText = `${pct}% incydentów poprzedza ekran nocny (>25m po 22:00)`;
    }
  }

  // 3. Risk Window detection (Now)
  const now = new Date();
  const currentHour = now.getHours();
  const currentDOW = now.getDay(); // 0 is Sunday
  const isNightTime = currentHour >= 20 || currentHour <= 1;
  const isSunday = currentDOW === 0;

  let riskWindowAlert: string | null = null;
  if (isSunday && isNightTime) {
    riskWindowAlert = '⚠️ Krytyczne okno ryzyka: Niedziela wieczór (statystyczny szczyt tygodnia)';
  } else if (isNightTime) {
    riskWindowAlert = 'Strefa nocna (20:00–01:00) — zaplanuj wyłączenie ekranów';
  }

  return {
    sleepCorrelationText,
    phoneCorrelationText,
    riskWindowAlert,
  };
}
