import { expect, test } from 'vitest';
import {
  allocateIntegerMinutes,
  buildPhoneUsageDailyPayload,
  evaluateCognitiveProfile,
  evaluateLateNightImpact,
  formatPhoneUsageDuration,
  resolveAppName,
} from '@vanguard/domain';
import { breakdownPhoneUsageDaily } from './phoneUsageSummary';

test('allocateIntegerMinutes — suma kategorii = total', () => {
  const out = allocateIntegerMinutes(642, [
    { key: 'entertainment', weightMs: 243 * 60_000 },
    { key: 'social', weightMs: 241 * 60_000 },
    { key: 'messaging', weightMs: 20 * 60_000 },
    { key: 'ai', weightMs: 19 * 60_000 },
    { key: 'browser', weightMs: 27 * 60_000 },
    { key: 'other', weightMs: 92 * 60_000 },
  ]);

  const sum = Object.values(out).reduce((acc, v) => acc + v, 0);
  expect(sum).toBe(642);
  expect(out.browser).toBeGreaterThan(0);
  expect(out.other).toBeGreaterThan(0);
});

test('buildPhoneUsageDailyPayload — kategorie + inne = total', () => {
  const payload = buildPhoneUsageDailyPayload('user', '2026-08-31', {
    unlocks: 78,
    lateNightMs: 35 * 60_000,
    packages: [
      { packageName: 'com.google.android.youtube', foregroundMs: 243 * 60_000 },
      { packageName: 'com.zhiliaoapp.musically', foregroundMs: 224 * 60_000 },
      { packageName: 'com.android.chrome', foregroundMs: 27 * 60_000 },
      { packageName: 'com.facebook.orca', foregroundMs: 20 * 60_000 },
      { packageName: 'com.openai.chatgpt', foregroundMs: 19 * 60_000 },
      { packageName: 'com.android.settings', foregroundMs: 109 * 60_000 },
    ],
  });

  const sum =
    payload.entertainment_minutes +
    payload.social_minutes +
    payload.messaging_minutes +
    payload.ai_minutes +
    payload.browser_minutes +
    payload.other_minutes;

  expect(payload.total_minutes).toBe(642);
  expect(sum).toBe(642);
  expect(payload.browser_minutes).toBeGreaterThan(0);
  expect(payload.other_minutes).toBeGreaterThan(0);
});

test('breakdownPhoneUsageDaily — domyka brakujące inne z legacy row', () => {
  const breakdown = breakdownPhoneUsageDaily({
    total_minutes: 642,
    entertainment_minutes: 243,
    social_minutes: 241,
    messaging_minutes: 20,
    ai_minutes: 19,
    browser_minutes: 27,
    late_night_minutes: 35,
    unlocks: 78,
  });

  expect(
    breakdown.entertainment +
      breakdown.social +
      breakdown.messaging +
      breakdown.ai +
      breakdown.browser +
      breakdown.other
  ).toBe(642);
  expect(breakdown.other).toBe(92);
});

test('formatPhoneUsageDuration — dojrzały format godzin i minut', () => {
  expect(formatPhoneUsageDuration(0)).toBe('0 min');
  expect(formatPhoneUsageDuration(15)).toBe('15 min');
  expect(formatPhoneUsageDuration(60)).toBe('1h');
  expect(formatPhoneUsageDuration(205)).toBe('3h 25m');
  expect(formatPhoneUsageDuration(125)).toBe('2h 5m');
});

test('resolveAppName — czyści pakiety i mapuje znane aplikacje', () => {
  expect(resolveAppName('com.google.android.youtube')).toBe('YouTube');
  expect(resolveAppName('com.zhiliaoapp.musically')).toBe('TikTok');
  expect(resolveAppName('com.facebook.katana')).toBe('Facebook');
  expect(resolveAppName('com.facebook.orca')).toBe('Messenger');
  expect(resolveAppName('com.openai.chatgpt')).toBe('ChatGPT');
  expect(resolveAppName('com.twitter.android')).toBe('X (Twitter)');
  expect(resolveAppName('com.xtb.xmobile2')).toBe('XTB');
  expect(resolveAppName('com.google.android.dialer')).toBe('Telefon');
  expect(resolveAppName('com.supercell.clashroyale')).toBe('Clash Royale');
  expect(resolveAppName('app.vanguard.os')).toBe('Sparky');
});

test('buildPhoneUsageDailyPayload — filtruje launchery i pakiety systemowe z total_minutes', () => {
  const payload = buildPhoneUsageDailyPayload('user', '2026-09-12', {
    unlocks: 40,
    lateNightMs: 15 * 60_000,
    packages: [
      { packageName: 'com.zhiliaoapp.musically', foregroundMs: 60 * 60_000 },
      { packageName: 'com.miui.home', foregroundMs: 30 * 60_000 }, // launcher should be excluded!
      { packageName: 'com.android.systemui', foregroundMs: 10 * 60_000 }, // systemui excluded!
      { packageName: 'com.openai.chatgpt', foregroundMs: 20 * 60_000 },
    ],
  });

  expect(payload.total_minutes).toBe(80); // 60 + 20, miui.home and systemui ignored!
  expect(payload.top_apps.map(a => a.pkg)).not.toContain('com.miui.home');
  expect(payload.top_apps.map(a => a.pkg)).not.toContain('com.android.systemui');
  expect(payload.late_night_minutes).toBe(15);
});

test('evaluateLateNightImpact — ocenia wpływ na melatoninę i sen', () => {
  expect(evaluateLateNightImpact(0).tier).toBe('optimal');
  expect(evaluateLateNightImpact(15).tier).toBe('mild');
  expect(evaluateLateNightImpact(35).tier).toBe('moderate');
  expect(evaluateLateNightImpact(60).tier).toBe('high');
});

test('evaluateCognitiveProfile — rozbicie na narzędzia vs rozrywkę i impulsywność', () => {
  const profile = evaluateCognitiveProfile({
    total_minutes: 200,
    ai_minutes: 60,
    browser_minutes: 40,
    social_minutes: 50,
    entertainment_minutes: 30,
    messaging_minutes: 20,
    unlocks: 40,
  });

  expect(profile.toolMinutes).toBe(100);
  expect(profile.passiveMinutes).toBe(80);
  expect(profile.entertainmentMinutes).toBe(30);
  expect(profile.toolRatio).toBe(50);
  expect(profile.entertainmentRatio).toBe(15);
  expect(profile.unlocks).toBe(40);
  // Interval and session length
  expect(profile.unlockIntervalMinutes).toBe(5); // 200 / 40 = 5
  expect(profile.avgSessionMinutes).toBe(5);
  expect(profile.attentionTier).toBe('normal'); // 40 unlocks is in 31–60 range
});

test('evaluateCognitiveProfile — tier escalation po progu', () => {
  expect(evaluateCognitiveProfile({ total_minutes: 300, unlocks: 25 }).attentionTier).toBe('focused');
  expect(evaluateCognitiveProfile({ total_minutes: 300, unlocks: 80 }).attentionTier).toBe('elevated');
  expect(evaluateCognitiveProfile({ total_minutes: 300, unlocks: 120 }).attentionTier).toBe('fragmented');
  expect(evaluateCognitiveProfile({ total_minutes: 300, unlocks: null }).attentionTier).toBe('unknown');
});

