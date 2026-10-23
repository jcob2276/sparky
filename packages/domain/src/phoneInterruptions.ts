import { resolveAppName } from './phoneUsage/categories.ts';
import type { DeviceSignalsDailyRow } from './deviceSignalsDaily.ts';

export const MIN_INTERRUPTION_DAYS = 3;
const MUTE_MIN_PER_DAY = 8;
const MUTE_MIN_SHARE_PCT = 10;
/** Packages we never suggest muting (calls, alarms, calendar, banking). */
const ESSENTIAL_PACKAGE = /dialer|telecom|phone|clock|alarm|calendar|contacts|bank|pko|mbank|ing\.|santander/i;

export interface InterruptionApp {
  pkg: string;
  name: string;
  total: number;
  perDay: number;
  sharePct: number;
}

export interface InterruptionSummary {
  /** Days that had notification data (the n behind every number). */
  days: number;
  perHourAvg: number | null;
  totalPerDayAvg: number | null;
  level: 'quiet' | 'moderate' | 'heavy' | null;
  topApps: InterruptionApp[];
  muteSuggestions: InterruptionApp[];
}

function levelFor(perHour: number): 'quiet' | 'moderate' | 'heavy' {
  if (perHour < 2) return 'quiet';
  return perHour < 5 ? 'moderate' : 'heavy';
}

/** Notifications per waking hour plus the apps that cause most of them (counts only, never content). */
export function summarizeInterruptions(daily: DeviceSignalsDailyRow[]): InterruptionSummary {
  const withData = daily.filter((d) => d.notifTotal > 0);
  const perApp = new Map<string, number>();
  let total = 0;
  for (const d of withData) {
    for (const [pkg, count] of Object.entries(d.notifTop)) {
      perApp.set(pkg, (perApp.get(pkg) ?? 0) + count);
      total += count;
    }
  }
  const days = withData.length;
  const apps: InterruptionApp[] = [...perApp.entries()]
    .map(([pkg, count]) => ({
      pkg,
      name: resolveAppName(pkg),
      total: count,
      perDay: days > 0 ? Math.round((count / days) * 10) / 10 : 0,
      sharePct: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
  const rates = withData.map((d) => d.notifPerHour).filter((v): v is number => v !== null);
  const perHourAvg = rates.length > 0 ? Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 10) / 10 : null;
  const enough = days >= MIN_INTERRUPTION_DAYS;
  return {
    days,
    perHourAvg: enough ? perHourAvg : null,
    totalPerDayAvg: enough ? Math.round(withData.reduce((a, d) => a + d.notifTotal, 0) / days) : null,
    level: enough && perHourAvg !== null ? levelFor(perHourAvg) : null,
    topApps: apps.slice(0, 5),
    muteSuggestions: enough
      ? apps
          .filter((a) => a.perDay >= MUTE_MIN_PER_DAY && a.sharePct >= MUTE_MIN_SHARE_PCT && !ESSENTIAL_PACKAGE.test(a.pkg))
          .slice(0, 3)
      : [],
  };
}
