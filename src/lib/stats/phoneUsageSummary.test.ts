import { expect, test } from 'vitest';
import { allocateIntegerMinutes, buildPhoneUsageDailyPayload } from '@vanguard/domain';
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
