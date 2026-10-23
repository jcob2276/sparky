import { describe, expect, it } from 'vitest';
import {
  buildPresenceSamples,
  computeDayPlaceTime,
  computePhoneSleepInsights,
  inferPlaceAnchors,
  summarizeInterruptions,
  type DeviceSignalsDailyRow,
  type LocationRowLike,
  type OuraNightRow,
} from '@vanguard/domain';
import { buildPhoneSignalsInsights } from './buildInsights';

function dailyRow(date: string, over: Partial<DeviceSignalsDailyRow> = {}): DeviceSignalsDailyRow {
  return {
    date,
    eventCount: 50,
    steps: 0,
    screenOnMin: 0,
    phoneSleepStart: null,
    phoneSleepEnd: null,
    phoneSleepMin: null,
    phoneSleepSteps: null,
    phoneSleepCharging: null,
    phoneSleepConfidence: null,
    screenAfter22Min: 0,
    eveningLuxAvg: null,
    eveningBrightnessAvg: null,
    eveningLightSamples: 0,
    notifTotal: 0,
    notifPerHour: null,
    notifAwakeHours: null,
    notifTop: {},
    homeWifiMin: 0,
    workWifiMin: 0,
    otherWifiMin: 0,
    cellularMin: 0,
    offlineMin: 0,
    ...over,
  };
}

const day = (i: number) => `2026-09-${String(i).padStart(2, '0')}`;

describe('sleep source comparison', () => {
  it('compares phone and Oura windows and reports n', () => {
    const daily = [
      dailyRow('2026-10-20', {
        phoneSleepStart: '2026-10-19T21:00:00Z',
        phoneSleepEnd: '2026-10-20T05:00:00Z',
        phoneSleepMin: 480,
        phoneSleepSteps: 5,
        phoneSleepCharging: true,
        phoneSleepConfidence: 'high',
      }),
    ];
    const oura: OuraNightRow[] = [
      {
        date: '2026-10-20',
        bedtimeStart: '2026-10-19T21:10:00Z',
        bedtimeEnd: '2026-10-20T04:50:00Z',
        totalSleepHours: 7.2,
        sleepScore: 80,
      },
    ];
    const { sleep } = buildPhoneSignalsInsights(daily, oura, [], '2026-10-21');
    expect(sleep.nPhone).toBe(1);
    expect(sleep.nBoth).toBe(1);
    expect(sleep.nights[0].bedDiffMin).toBe(-10);
    expect(sleep.nights[0].wakeDiffMin).toBe(10);
    expect(sleep.meanAbsBedDiffMin).toBe(10);
  });
});

describe('interruptions', () => {
  it('stays empty below 3 days and suggests muting a dominant non-essential app', () => {
    const few = summarizeInterruptions([dailyRow(day(1), { notifTotal: 50, notifTop: { 'com.x': 50 } })]);
    expect(few.perHourAvg).toBeNull();
    expect(few.days).toBe(1);

    const rows = [1, 2, 3, 4].map((i) =>
      dailyRow(day(i), {
        notifTotal: 60,
        notifPerHour: 4,
        notifTop: { 'com.social.app': 40, 'com.google.android.dialer': 20 },
      }),
    );
    const s = summarizeInterruptions(rows);
    expect(s.perHourAvg).toBe(4);
    expect(s.level).toBe('moderate');
    expect(s.muteSuggestions.map((a) => a.pkg)).toEqual(['com.social.app']);
  });
});

describe('place time', () => {
  const home = { lat: 50.0413, lng: 21.999 };
  const work = { lat: 50.06, lng: 22.02 };
  const at = (iso: string, p: { lat: number; lng: number }): LocationRowLike => ({
    created_at: iso,
    latitude: p.lat,
    longitude: p.lng,
    kind: 'visit',
    dwell_seconds: 4 * 3600,
  });

  it('infers home from nights and work from weekday daytime, then splits a day', () => {
    const rows: LocationRowLike[] = [];
    for (const d of ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15']) {
      rows.push(at(`${d}T22:00:00Z`, home));
      rows.push(at(`${d}T08:00:00Z`, work));
    }
    const samples = buildPresenceSamples(rows);
    const anchors = inferPlaceAnchors(samples);
    expect(anchors.home).not.toBeNull();
    expect(anchors.work).not.toBeNull();
    const dayTime = computeDayPlaceTime('2026-10-13', samples, anchors, null);
    expect(dayTime.source).toBe('gps');
    expect(dayTime.workMin).toBeGreaterThan(0);
    expect(dayTime.homeMin).toBeGreaterThan(0);
  });

  it('falls back to Wi-Fi labels when GPS is off and says so', () => {
    const t = computeDayPlaceTime('2026-10-13', [], { home: null, work: null, homeNights: 0, workDays: 0 }, {
      homeWifiMin: 600,
      workWifiMin: 120,
      otherWifiMin: 30,
      cellularMin: 90,
      offlineMin: 0,
    });
    expect(t.source).toBe('wifi');
    expect(t.homeMin).toBe(600);
    expect(t.awayMin).toBe(120);
  });

  it('reports no data instead of inventing minutes', () => {
    const t = computeDayPlaceTime('2026-10-13', [], { home: null, work: null, homeNights: 0, workDays: 0 }, null);
    expect(t).toMatchObject({ source: 'none', homeMin: null, awayMin: null });
  });
});

describe('sleep correlations', () => {
  it('refuses to conclude below 14 nights', () => {
    const daily = [1, 2, 3].map((i) => dailyRow(day(i), { screenAfter22Min: i * 10 }));
    const oura = [1, 2, 3].map((i) => ({ date: day(i), bedtimeStart: null, bedtimeEnd: null, totalSleepHours: 7, sleepScore: 70 + i }));
    const r = computePhoneSleepInsights(daily, oura);
    expect(r.status).toBe('insufficient');
    expect(r.nights).toBe(3);
  });

  it('flags a clear negative link with n shown', () => {
    const daily: DeviceSignalsDailyRow[] = [];
    const oura: OuraNightRow[] = [];
    for (let i = 1; i <= 20; i += 1) {
      daily.push(dailyRow(day(i), { screenAfter22Min: i * 5 }));
      oura.push({ date: day(i), bedtimeStart: null, bedtimeEnd: null, totalSleepHours: 8 - i * 0.05, sleepScore: 90 - i + (i % 3) });
    }
    const r = computePhoneSleepInsights(daily, oura);
    expect(r.status).toBe('ready');
    const c = r.correlations.find((x) => x.metric === 'screenAfter22' && x.outcome === 'sleepScore');
    expect(c?.n).toBe(20);
    expect(c?.verdict).toBe('clear');
    expect(c?.r).toBeLessThan(0);
  });
});
