import { allocateIntegerMinutes } from '@vanguard/domain';

export interface PhoneUsageBreakdown {
  total: number;
  entertainment: number;
  social: number;
  messaging: number;
  ai: number;
  browser: number;
  other: number;
  lateNight: number;
  unlocks: number;
}

export interface PhoneUsageRowInput {
  total_minutes: number | null;
  entertainment_minutes: number | null;
  social_minutes: number | null;
  messaging_minutes: number | null;
  ai_minutes: number | null;
  browser_minutes: number | null;
  late_night_minutes: number | null;
  unlocks: number | null;
}

/** Normalize stored row so category minutes always reconcile with total. */
export function breakdownPhoneUsageDaily(row: PhoneUsageRowInput): PhoneUsageBreakdown {
  const raw = {
    entertainment: row.entertainment_minutes ?? 0,
    social: row.social_minutes ?? 0,
    messaging: row.messaging_minutes ?? 0,
    ai: row.ai_minutes ?? 0,
    browser: row.browser_minutes ?? 0,
  };
  const total = row.total_minutes ?? 0;
  const categorized = raw.entertainment + raw.social + raw.messaging + raw.ai + raw.browser;

  if (total <= 0) {
    return {
      total: 0,
      ...raw,
      other: 0,
      lateNight: row.late_night_minutes ?? 0,
      unlocks: row.unlocks ?? 0,
    };
  }

  if (categorized <= total) {
    return {
      total,
      ...raw,
      other: total - categorized,
      lateNight: row.late_night_minutes ?? 0,
      unlocks: row.unlocks ?? 0,
    };
  }

  const reconciled = allocateIntegerMinutes(total, [
    { key: 'entertainment', weightMs: raw.entertainment },
    { key: 'social', weightMs: raw.social },
    { key: 'messaging', weightMs: raw.messaging },
    { key: 'ai', weightMs: raw.ai },
    { key: 'browser', weightMs: raw.browser },
  ]);

  return {
    total,
    entertainment: reconciled.entertainment ?? 0,
    social: reconciled.social ?? 0,
    messaging: reconciled.messaging ?? 0,
    ai: reconciled.ai ?? 0,
    browser: reconciled.browser ?? 0,
    other: 0,
    lateNight: row.late_night_minutes ?? 0,
    unlocks: row.unlocks ?? 0,
  };
}

export function formatPhoneUsagePct(minutes: number, total: number): string {
  if (total <= 0 || minutes <= 0) return '0%';
  return `${Math.round((minutes / total) * 100)}%`;
}
