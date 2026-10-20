import { expect, test } from 'vitest';
import { buildPhoneUsageDailyPayload, normalizeUsageBuckets } from '@vanguard/domain';

const base = { packages: [], unlocks: 0, lateNightMs: 0 };
const valid = Array.from({ length: 48 }, (_, i) => (i % 31));

test('usage_buckets: poprawna tablica 48 liczb calkowitych 0..30 przechodzi', () => {
  const payload = buildPhoneUsageDailyPayload('u', '2026-10-20', { ...base, bucketMinutes: valid });
  expect(payload.usage_buckets).toEqual(valid);
  expect(payload.usage_buckets).not.toBe(valid);
});

test('usage_buckets: stary APK bez pola -> null', () => {
  expect(buildPhoneUsageDailyPayload('u', '2026-10-20', base).usage_buckets).toBeNull();
});

test('usage_buckets: zla dlugosc / wartosci -> null', () => {
  expect(normalizeUsageBuckets(valid.slice(0, 47))).toBeNull();
  expect(normalizeUsageBuckets([...valid, 1])).toBeNull();
  expect(normalizeUsageBuckets(valid.map((v, i) => (i === 3 ? 31 : v)))).toBeNull();
  expect(normalizeUsageBuckets(valid.map((v, i) => (i === 3 ? -1 : v)))).toBeNull();
  expect(normalizeUsageBuckets(valid.map((v, i) => (i === 3 ? 1.5 : v)))).toBeNull();
  expect(normalizeUsageBuckets(valid.map((v, i) => (i === 3 ? NaN : v)))).toBeNull();
  expect(normalizeUsageBuckets('x')).toBeNull();
});
