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

export function categorizePhonePackage(packageName: string): PhoneUsageCategory {
  const pkg = packageName.toLowerCase();
  for (const key of PHONE_USAGE_CATEGORY_KEYS) {
    if (CATEGORY_MATCHERS[key].some((needle) => pkg.includes(needle))) return key;
  }
  return 'inne';
}
