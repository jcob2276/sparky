/** Package-name heuristics — keep in sync with scripts/aw/aw-phone-import.cjs */
export const PHONE_USAGE_CATEGORY_KEYS = [
  'social',
  'messaging',
  'entertainment',
  'ai',
  'browser',
] as const;

export type PhoneUsageCategory = (typeof PHONE_USAGE_CATEGORY_KEYS)[number] | 'inne';

const CATEGORY_MATCHERS: Record<Exclude<PhoneUsageCategory, 'inne'>, string[]> = {
  social: ['musically', 'tiktok', 'twitter', 'xmobile', 'instagram', 'badoo', 'snapchat', 'pinterest'],
  messaging: ['orca', 'telegram', 'whatsapp', 'viber', 'signal'],
  entertainment: ['youtube', 'netflix', 'twitch', 'spotify', 'tidal', 'hbomax', 'prime'],
  ai: ['chatgpt', 'grok', 'claude', 'perplexity', 'gemini', 'copilot'],
  browser: ['chrome', 'brave', 'firefox', 'opera', 'edge', 'duckduckgo'],
};

export function categorizePhonePackage(packageName: string): PhoneUsageCategory {
  const pkg = packageName.toLowerCase();
  for (const key of PHONE_USAGE_CATEGORY_KEYS) {
    if (CATEGORY_MATCHERS[key].some((needle) => pkg.includes(needle))) return key;
  }
  return 'inne';
}

export interface PhoneUsagePackageRow {
  packageName: string;
  foregroundMs: number;
}

export interface PhoneUsageSnapshot {
  packages: PhoneUsagePackageRow[];
  unlocks: number;
  lateNightMs: number;
}

export interface PhoneUsageDailyPayload {
  user_id: string;
  date: string;
  total_minutes: number;
  late_night_minutes: number;
  social_minutes: number;
  messaging_minutes: number;
  entertainment_minutes: number;
  ai_minutes: number;
  browser_minutes: number;
  other_minutes: number;
  unlocks: number;
  top_apps: Array<{ app: string; pkg: string; min: number }>;
}

/** Split integer minutes across buckets so the parts sum exactly to totalMin. */
export function allocateIntegerMinutes(
  totalMin: number,
  buckets: Array<{ key: string; weightMs: number }>,
): Record<string, number> {
  const out = Object.fromEntries(buckets.map((b) => [b.key, 0]));
  if (totalMin <= 0) return out;

  const totalWeight = buckets.reduce((sum, b) => sum + b.weightMs, 0);
  if (totalWeight <= 0) {
    out[buckets[0]?.key ?? 'other'] = totalMin;
    return out;
  }

  const exact = buckets.map((b) => ({
    key: b.key,
    value: (b.weightMs / totalWeight) * totalMin,
  }));
  const floored = exact.map((e) => ({
    key: e.key,
    min: Math.floor(e.value),
    frac: e.value - Math.floor(e.value),
  }));

  for (const row of floored) out[row.key] = row.min;

  let remain = totalMin - floored.reduce((sum, row) => sum + row.min, 0);
  const order = [...floored].sort((a, b) => b.frac - a.frac);
  for (let i = 0; remain > 0; i++, remain--) {
    out[order[i % order.length].key] += 1;
  }

  return out;
}

export function buildPhoneUsageDailyPayload(
  userId: string,
  date: string,
  snapshot: PhoneUsageSnapshot,
): PhoneUsageDailyPayload {
  const catMs: Record<Exclude<PhoneUsageCategory, 'inne'>, number> = {
    social: 0,
    messaging: 0,
    entertainment: 0,
    ai: 0,
    browser: 0,
  };

  let totalMs = 0;
  const ranked: Array<{ pkg: string; ms: number }> = [];

  for (const row of snapshot.packages) {
    if (row.foregroundMs <= 0) continue;
    totalMs += row.foregroundMs;
    ranked.push({ pkg: row.packageName, ms: row.foregroundMs });
    const cat = categorizePhonePackage(row.packageName);
    if (cat !== 'inne') catMs[cat] += row.foregroundMs;
  }

  ranked.sort((a, b) => b.ms - a.ms);
  const top_apps = ranked.slice(0, 10).map(({ pkg, ms }) => ({
    app: pkg.split('.').pop() ?? pkg,
    pkg,
    min: Math.round(ms / 60_000),
  }));

  const categorizedMs = PHONE_USAGE_CATEGORY_KEYS.reduce((sum, key) => sum + catMs[key], 0);
  const otherMs = Math.max(0, totalMs - categorizedMs);
  const totalMinutes = Math.round(totalMs / 60_000);

  const minutes = allocateIntegerMinutes(totalMinutes, [
    { key: 'social', weightMs: catMs.social },
    { key: 'messaging', weightMs: catMs.messaging },
    { key: 'entertainment', weightMs: catMs.entertainment },
    { key: 'ai', weightMs: catMs.ai },
    { key: 'browser', weightMs: catMs.browser },
    { key: 'other', weightMs: otherMs },
  ]);

  const toMin = (ms: number) => Math.round(ms / 60_000);

  return {
    user_id: userId,
    date,
    total_minutes: totalMinutes,
    late_night_minutes: toMin(snapshot.lateNightMs),
    social_minutes: minutes.social ?? 0,
    messaging_minutes: minutes.messaging ?? 0,
    entertainment_minutes: minutes.entertainment ?? 0,
    ai_minutes: minutes.ai ?? 0,
    browser_minutes: minutes.browser ?? 0,
    other_minutes: minutes.other ?? 0,
    unlocks: snapshot.unlocks,
    top_apps,
  };
}
