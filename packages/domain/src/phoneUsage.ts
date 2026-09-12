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
  social: ['musically', 'tiktok', 'twitter', 'x.android', 'instagram', 'badoo', 'snapchat', 'pinterest', 'reddit', 'threads', 'katana', 'linkedin'],
  messaging: ['orca', 'telegram', 'whatsapp', 'viber', 'signal', 'discord', 'slack', 'messenger'],
  entertainment: ['youtube', 'netflix', 'twitch', 'spotify', 'tidal', 'hbomax', 'prime', 'disney', 'game', 'chess', 'lichess', 'clashroyale', 'brawlstars'],
  ai: ['chatgpt', 'openai', 'grok', 'claude', 'anthropic', 'perplexity', 'gemini', 'bard', 'copilot', 'poe'],
  browser: ['chrome', 'brave', 'firefox', 'opera', 'edge', 'duckduckgo', 'sbrowser'],
};

export const KNOWN_APP_NAMES: Record<string, string> = {
  'com.google.android.youtube': 'YouTube',
  'com.google.android.apps.youtube.music': 'YouTube Music',
  'com.zhiliaoapp.musically': 'TikTok',
  'com.instagram.android': 'Instagram',
  'com.twitter.android': 'X (Twitter)',
  'com.x.android': 'X (Twitter)',
  'com.facebook.katana': 'Facebook',
  'com.facebook.orca': 'Messenger',
  'org.telegram.messenger': 'Telegram',
  'org.telegram.messenger.web': 'Telegram',
  'com.whatsapp': 'WhatsApp',
  'com.openai.chatgpt': 'ChatGPT',
  'com.anthropic.claude': 'Claude',
  'com.google.android.apps.bard': 'Gemini',
  'ai.perplexity.app.android': 'Perplexity',
  'com.android.chrome': 'Chrome',
  'com.brave.browser': 'Brave',
  'org.mozilla.firefox': 'Firefox',
  'com.microsoft.emmx': 'Edge',
  'com.spotify.music': 'Spotify',
  'com.netflix.mediaclient': 'Netflix',
  'com.reddit.frontpage': 'Reddit',
  'com.linkedin.android': 'LinkedIn',
  'com.discord': 'Discord',
  'com.Slack': 'Slack',
  'com.ouraring.oura': 'Oura',
  'com.strava': 'Strava',
  'com.garmin.android.apps.connectmobile': 'Garmin Connect',
  'com.google.android.gm': 'Gmail',
  'com.google.android.apps.maps': 'Google Maps',
  'com.google.android.apps.photos': 'Zdjęcia Google',
  'com.google.android.calendar': 'Kalendarz',
  'com.google.android.dialer': 'Telefon',
  'com.google.android.apps.messaging': 'Wiadomości',
  'com.google.android.googlequicksearchbox': 'Google',
  'com.supercell.clashroyale': 'Clash Royale',
  'com.xtb.xmobile2': 'XTB',
  'com.android.deskclock': 'Zegar',
  'app.vanguard.os': 'Sparky',
  'com.duolingo': 'Duolingo',
  'pl.allegro': 'Allegro',
  'com.todoist': 'Todoist',
};

const SYSTEM_PACKAGES = new Set([
  'android',
  'com.android.systemui',
  'com.google.android.apps.nexuslauncher',
  'com.sec.android.app.launcher',
  'com.google.android.inputmethod.latin',
  'com.samsung.android.honeyboard',
  'com.touchtype.swiftkey',
  'com.android.launcher3',
  'com.miui.home',
  'com.huawei.android.launcher',
  'com.oppo.launcher',
  'com.oneplus.launcher',
  'com.android.permissioncontroller',
]);

export function isSystemApp(packageName: string): boolean {
  return SYSTEM_PACKAGES.has(packageName.toLowerCase());
}

export function resolveAppName(packageName: string): string {
  const lower = packageName.toLowerCase();
  if (KNOWN_APP_NAMES[lower] || KNOWN_APP_NAMES[packageName]) {
    return KNOWN_APP_NAMES[lower] || KNOWN_APP_NAMES[packageName];
  }
  if (lower.includes('youtube')) return 'YouTube';
  if (lower.includes('instagram')) return 'Instagram';
  if (lower.includes('tiktok') || lower.includes('musically')) return 'TikTok';
  if (lower.includes('twitter') || lower.includes('xmobile')) return 'X (Twitter)';
  if (lower.includes('telegram')) return 'Telegram';
  if (lower.includes('whatsapp')) return 'WhatsApp';
  if (lower.includes('messenger') || lower.includes('orca')) return 'Messenger';
  if (lower.includes('facebook') || lower.includes('katana')) return 'Facebook';
  if (lower.includes('chatgpt') || lower.includes('openai')) return 'ChatGPT';
  if (lower.includes('claude')) return 'Claude';
  if (lower.includes('perplexity')) return 'Perplexity';
  if (lower.includes('gemini') || lower.includes('bard')) return 'Gemini';
  if (lower.includes('chrome')) return 'Chrome';
  if (lower.includes('spotify')) return 'Spotify';
  if (lower.includes('netflix')) return 'Netflix';
  if (lower.includes('reddit')) return 'Reddit';
  if (lower.includes('slack')) return 'Slack';
  if (lower.includes('discord')) return 'Discord';
  if (lower.includes('oura')) return 'Oura';
  if (lower.includes('strava')) return 'Strava';

  const parts = packageName.split('.');
  let candidate = parts[parts.length - 1];
  if (
    (candidate === 'android' || candidate === 'app' || candidate === 'client' || candidate === 'mobile') &&
    parts.length > 1
  ) {
    candidate = parts[parts.length - 2];
  }
  return candidate.charAt(0).toUpperCase() + candidate.slice(1);
}

export function formatPhoneUsageDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return '0 min';
  const mins = Math.round(minutes);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export type LateNightImpactTier = 'optimal' | 'mild' | 'moderate' | 'high';

export interface LateNightImpact {
  tier: LateNightImpactTier;
  minutes: number;
  label: string;
  badge: string;
  description: string;
  color: 'text-success' | 'text-warning' | 'text-danger';
  bgColor: string;
}

export function evaluateLateNightImpact(lateNightMinutes: number | null | undefined): LateNightImpact {
  const min = Math.max(0, Math.round(lateNightMinutes ?? 0));
  if (min === 0) {
    return {
      tier: 'optimal',
      minutes: 0,
      label: 'Czysty bufor snu',
      badge: 'Optymalnie',
      description: 'Brak ekspozycji na ekran późnym wieczorem. Optymalne warunki dla naturalnego wyrzutu melatoniny.',
      color: 'text-success',
      bgColor: 'bg-success/10',
    };
  }
  if (min <= 20) {
    return {
      tier: 'mild',
      minutes: min,
      label: 'Minimalny wpływ',
      badge: 'Niski wpływ',
      description: `${min} min późnym wieczorem. Krótka ekspozycja o znikomym wpływie na latencję i architekturę snu.`,
      color: 'text-success',
      bgColor: 'bg-success/10',
    };
  }
  if (min <= 45) {
    return {
      tier: 'moderate',
      minutes: min,
      label: 'Umiarkowane światło',
      badge: 'Umiarkowany',
      description: `${min} min późnym wieczorem. Niebieskie światło może opóźnić fazę REM i wydłużyć czas zasypiania.`,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    };
  }
  return {
    tier: 'high',
    minutes: min,
    label: 'Wysoka ekspozycja nocna',
    badge: 'Stłumienie melatoniny',
    description: `${min} min późnym wieczorem. Ryzyko silnego stłumienia melatoniny, opóźnienia snu głębokiego i gorszej regeneracji Oura.`,
    color: 'text-danger',
    bgColor: 'bg-danger/10',
  };
}

export interface PhoneCognitiveProfile {
  toolMinutes: number;
  passiveMinutes: number;
  entertainmentMinutes: number;
  communicationMinutes: number;
  otherMinutes: number;
  toolRatio: number;
  passiveRatio: number;
  entertainmentRatio: number;
  unlocks: number | null;
  unlockIntervalMinutes: number | null;
  attentionLabel: string;
  attentionTier: 'focused' | 'normal' | 'elevated' | 'fragmented' | 'unknown';
}

export function evaluateCognitiveProfile(input: {
  total_minutes: number | null;
  social_minutes?: number | null;
  messaging_minutes?: number | null;
  entertainment_minutes?: number | null;
  ai_minutes?: number | null;
  browser_minutes?: number | null;
  other_minutes?: number | null;
  unlocks?: number | null;
}): PhoneCognitiveProfile {
  const total = Math.max(0, input.total_minutes ?? 0);
  const ai = Math.max(0, input.ai_minutes ?? 0);
  const browser = Math.max(0, input.browser_minutes ?? 0);
  const social = Math.max(0, input.social_minutes ?? 0);
  const entertainment = Math.max(0, input.entertainment_minutes ?? 0);
  const messaging = Math.max(0, input.messaging_minutes ?? 0);
  const other = Math.max(0, input.other_minutes ?? 0);

  const toolMinutes = ai + browser;
  const passiveMinutes = social + entertainment;
  const communicationMinutes = messaging;

  const toolRatio = total > 0 ? Math.round((toolMinutes / total) * 100) : 0;
  const passiveRatio = total > 0 ? Math.round((passiveMinutes / total) * 100) : 0;
  const entertainmentRatio = total > 0 ? Math.round((entertainment / total) * 100) : 0;

  const unlocks = input.unlocks ?? null;
  let unlockIntervalMinutes: number | null = null;
  let attentionLabel = 'Brak danych o odblokowaniach';
  let attentionTier: PhoneCognitiveProfile['attentionTier'] = 'unknown';

  if (unlocks != null && unlocks > 0) {
    // Use actual screen-on minutes as the denominator for realistic interval
    const windowMinutes = total > 10 ? total : 960;
    unlockIntervalMinutes = Math.max(1, Math.round(windowMinutes / unlocks));
    if (unlocks <= 30) {
      attentionLabel = 'Wysokie skupienie · Niska impulsywność';
      attentionTier = 'focused';
    } else if (unlocks <= 60) {
      attentionLabel = 'Standardowa częstotliwość sprawdzania';
      attentionTier = 'normal';
    } else if (unlocks <= 100) {
      attentionLabel = 'Podwyższona fragmentacja uwagi';
      attentionTier = 'elevated';
    } else {
      attentionLabel = 'Wysoka fragmentacja uwagi · Częste odruchy impulsywne';
      attentionTier = 'fragmented';
    }
  }

  return {
    toolMinutes,
    passiveMinutes,
    entertainmentMinutes: entertainment,
    communicationMinutes,
    otherMinutes: other,
    toolRatio,
    passiveRatio,
    entertainmentRatio,
    unlocks,
    unlockIntervalMinutes,
    attentionLabel,
    attentionTier,
  };
}

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
  totalForegroundMs?: number;
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
    if (row.foregroundMs <= 0 || isSystemApp(row.packageName)) continue;
    totalMs += row.foregroundMs;
    ranked.push({ pkg: row.packageName, ms: row.foregroundMs });
    const cat = categorizePhonePackage(row.packageName);
    if (cat !== 'inne') catMs[cat] += row.foregroundMs;
  }

  ranked.sort((a, b) => b.ms - a.ms);
  const top_apps = ranked
    .slice(0, 10)
    .map(({ pkg, ms }) => ({
      app: resolveAppName(pkg),
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
  const rawLateNight = toMin(snapshot.lateNightMs);
  const safeLateNight = Math.min(rawLateNight, totalMinutes);

  return {
    user_id: userId,
    date,
    total_minutes: totalMinutes,
    late_night_minutes: safeLateNight,
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
