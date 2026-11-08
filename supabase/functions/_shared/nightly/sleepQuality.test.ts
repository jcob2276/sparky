import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { computeSleepQuality, type SleepNightRow } from './sleepQuality.ts';

const dayStr = (i: number) => new Date(Date.UTC(2026, 8, 1 + i)).toISOString().slice(0, 10);

function nights(today: Partial<SleepNightRow>, bedHourUtc = 21): SleepNightRow[] {
  const rows: SleepNightRow[] = Array.from({ length: 30 }, (_, i) => ({
    date: dayStr(i),
    total_sleep_hours: 7 + (i % 3) * 0.2,
    deep_sleep_hours: 1.4 + (i % 4) * 0.05,
    rem_sleep_hours: 1.5 + (i % 3) * 0.05,
    sleep_efficiency: 85 + (i % 3),
    latency_minutes: 15 + (i % 4),
    bedtime_timestamp: `${dayStr(i)}T${String(bedHourUtc).padStart(2, '0')}:${i % 2 ? '10' : '20'}:00+00`,
  }));
  rows.push({ date: dayStr(30), total_sleep_hours: 7.2, deep_sleep_hours: 1.5, rem_sleep_hours: 1.6, sleep_efficiency: 86, latency_minutes: 16, bedtime_timestamp: `${dayStr(30)}T${String(bedHourUtc).padStart(2, '0')}:15:00+00`, ...today });
  return rows;
}

Deno.test('zwykła noc jest blisko normy', () => {
  const q = computeSleepQuality(nights({}), dayStr(30))!;
  assertEquals(Math.abs(q.z) < 0.8, true);
});

Deno.test('więcej głębokiego snu i REM podnosi jakość, mało obniża', () => {
  const good = computeSleepQuality(nights({ deep_sleep_hours: 2.2, rem_sleep_hours: 2.0 }), dayStr(30))!;
  const poor = computeSleepQuality(nights({ deep_sleep_hours: 0.6, rem_sleep_hours: 0.7 }), dayStr(30))!;
  assertEquals(good.z > 1, true);
  assertEquals(poor.z < -1, true);
});

Deno.test('rozjechana pora zasypiania obniża regularność', () => {
  const rows = nights({});
  const regular = computeSleepQuality(rows, dayStr(30))!;
  const chaotic = computeSleepQuality(rows.map((r, i) => (i >= 24 ? { ...r, bedtime_timestamp: `${r.date}T${String(19 + (i % 4) * 2).padStart(2, '0')}:00:00+00` } : r)), dayStr(30))!;
  assertEquals(chaotic.parts.regularity < regular.parts.regularity, true);
});

Deno.test('za mało historii albo brak faz snu to null', () => {
  assertEquals(computeSleepQuality(nights({}).slice(-8), dayStr(30)), null);
  assertEquals(computeSleepQuality(nights({ deep_sleep_hours: null, rem_sleep_hours: null }), dayStr(30)), null);
});
