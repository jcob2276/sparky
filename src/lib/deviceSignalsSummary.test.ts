import { describe, expect, it } from 'vitest';
import { summarizeDeviceSignals, type DeviceSignalEventRow } from '@vanguard/domain';

const iso = (hhmm: string) => new Date(`2026-10-22T${hhmm}:00Z`).toISOString();
const ev = (hhmm: string, kind: string, payload: Record<string, unknown>): DeviceSignalEventRow => ({
  ts: iso(hhmm),
  kind,
  payload,
});

describe('summarizeDeviceSignals', () => {
  const now = new Date('2026-10-22T20:00:00Z').getTime();

  it('sums steps, unlocks and notification counts without content', () => {
    const s = summarizeDeviceSignals(
      [
        ev('08:00', 'steps', { d: 120 }),
        ev('09:00', 'steps', { d: 80 }),
        ev('09:01', 'unlock', {}),
        ev('09:30', 'unlock', {}),
        ev('10:00', 'notif', { n: 5, c: { 'com.a': 3, 'com.b': 2 } }),
        ev('11:00', 'notif', { n: 4, c: { 'com.a': 4 } }),
      ],
      now,
    );
    expect(s.steps).toBe(200);
    expect(s.unlocks).toBe(2);
    expect(s.notificationsTotal).toBe(9);
    expect(s.notificationsTop[0]).toEqual({ pkg: 'com.a', count: 7 });
  });

  it('turns screen events into on-minutes and a finished sleep-proxy gap', () => {
    const s = summarizeDeviceSignals(
      [
        ev('04:00', 'screen', { on: false }),
        ev('06:00', 'screen', { on: true }),
        ev('06:30', 'screen', { on: false }),
        ev('06:40', 'screen', { on: true }),
      ],
      now,
    );
    expect(s.longestScreenOffGap?.minutes).toBe(120);
    expect(s.screenOnMinutes).toBeGreaterThanOrEqual(30);
    expect(s.firstScreenOn).not.toBeNull();
  });

  it('does not treat a gap that is still running as a finished sleep', () => {
    const s = summarizeDeviceSignals([ev('15:00', 'screen', { on: false })], now);
    expect(s.longestScreenOffGap).toBeNull();
  });

  it('splits network time by label and tracks battery, DND and headphones', () => {
    const s = summarizeDeviceSignals(
      [
        ev('08:00', 'network', { t: 'wifi', lbl: 'home' }),
        ev('09:00', 'network', { t: 'cell', lbl: null }),
        ev('10:00', 'network', { t: 'wifi', lbl: 'work' }),
        ev('11:00', 'network', { t: 'none', lbl: null }),
        ev('08:00', 'battery', { lvl: 80, chg: false }),
        ev('09:00', 'battery', { lvl: 40, chg: false }),
        ev('09:30', 'battery', { lvl: 40, chg: true }),
        ev('10:00', 'dnd', { f: 'priority' }),
        ev('11:00', 'dnd', { f: 'all' }),
        ev('12:00', 'audio', { out: 'bt' }),
        ev('12:30', 'audio', { out: 'none' }),
      ],
      new Date('2026-10-22T12:30:00Z').getTime(),
    );
    expect(s.homeWifiMinutes).toBe(60);
    expect(s.cellularMinutes).toBe(60);
    expect(s.workWifiMinutes).toBe(60);
    expect(s.offlineMinutes).toBe(90);
    expect(s.batteryMin).toBe(40);
    expect(s.charging).toBe(true);
    expect(s.dndMinutes).toBe(60);
    expect(s.headphonesMinutes).toBe(30);
  });

  it('returns neutral values for an empty day', () => {
    const s = summarizeDeviceSignals([], now);
    expect(s.eventCount).toBe(0);
    expect(s.batteryLevel).toBeNull();
    expect(s.avgLux).toBeNull();
    expect(s.steps).toBe(0);
  });
});
