import { warsawTimeOfDay } from './date.ts';

/** Signal kinds collected by the Android collectors (mirrors device_signal_events.kind). */
export const DEVICE_SIGNAL_KINDS = [
  'battery',
  'network',
  'steps',
  'screen',
  'dnd',
  'notif',
  'audio',
  'light',
  'traffic',
] as const;

export type DeviceSignalKind = (typeof DEVICE_SIGNAL_KINDS)[number];

export interface DeviceSignalEventRow {
  ts: string;
  kind: string;
  payload: unknown;
}

export interface DeviceSignalsDaySummary {
  eventCount: number;
  steps: number;
  screenOnMinutes: number;
  unlocks: number;
  firstScreenOn: string | null;
  lastScreenOff: string | null;
  /** Longest screen-off stretch (>= 2 h) seen in the day: a proxy for sleep. */
  longestScreenOffGap: { from: string; to: string; minutes: number } | null;
  batteryLevel: number | null;
  batteryMin: number | null;
  charging: boolean | null;
  chargingMinutes: number;
  homeWifiMinutes: number;
  workWifiMinutes: number;
  otherWifiMinutes: number;
  cellularMinutes: number;
  offlineMinutes: number;
  dndMinutes: number;
  headphonesMinutes: number;
  notificationsTotal: number;
  notificationsTop: Array<{ pkg: string; count: number }>;
  avgLux: number | null;
  lightSamples: number;
  mobileMb: number;
  totalMb: number;
}

interface Interval {
  startMs: number;
  endMs: number;
  payload: Record<string, unknown>;
}

const MIN_SLEEP_GAP_MIN = 120;
const MAX_STATE_INTERVAL_MS = 12 * 3600_000;

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function minutes(ms: number): number {
  return Math.max(0, Math.round(ms / 60_000));
}

/** Turns state-change events of one kind into [start, next change) intervals up to endMs. */
function toIntervals(rows: DeviceSignalEventRow[], kind: string, endMs: number): Interval[] {
  const events = rows
    .filter((r) => r.kind === kind)
    .map((r) => ({ ms: new Date(r.ts).getTime(), payload: asRecord(r.payload) }))
    .filter((e) => Number.isFinite(e.ms))
    .sort((a, b) => a.ms - b.ms);
  const out: Interval[] = [];
  for (let i = 0; i < events.length; i += 1) {
    const next = i + 1 < events.length ? events[i + 1].ms : endMs;
    const end = Math.min(next, events[i].ms + MAX_STATE_INTERVAL_MS, endMs);
    if (end > events[i].ms) out.push({ startMs: events[i].ms, endMs: end, payload: events[i].payload });
  }
  return out;
}

function sumMs(intervals: Interval[], pick: (p: Record<string, unknown>) => boolean): number {
  return intervals.reduce((acc, it) => (pick(it.payload) ? acc + (it.endMs - it.startMs) : acc), 0);
}

function summarizeScreen(rows: DeviceSignalEventRow[], endMs: number) {
  const intervals = toIntervals(rows, 'screen', endMs);
  const on = intervals.filter((it) => it.payload.on === true);
  const off = intervals.filter((it) => it.payload.on === false);
  let gap: DeviceSignalsDaySummary['longestScreenOffGap'] = null;
  for (const it of off) {
    const mins = minutes(it.endMs - it.startMs);
    // a gap that still runs until "now" is not finished sleep
    const ended = it.endMs < endMs;
    if (ended && mins >= MIN_SLEEP_GAP_MIN && (!gap || mins > gap.minutes)) {
      gap = {
        from: warsawTimeOfDay(new Date(it.startMs).toISOString()),
        to: warsawTimeOfDay(new Date(it.endMs).toISOString()),
        minutes: mins,
      };
    }
  }
  return {
    screenOnMinutes: minutes(on.reduce((acc, it) => acc + (it.endMs - it.startMs), 0)),
    firstScreenOn: on.length > 0 ? warsawTimeOfDay(new Date(on[0].startMs).toISOString()) : null,
    lastScreenOff: off.length > 0 ? warsawTimeOfDay(new Date(off[off.length - 1].startMs).toISOString()) : null,
    longestScreenOffGap: gap,
  };
}

function summarizeNotifications(rows: DeviceSignalEventRow[]) {
  const perPkg = new Map<string, number>();
  let total = 0;
  for (const r of rows) {
    if (r.kind !== 'notif') continue;
    const counts = asRecord(asRecord(r.payload).c);
    for (const [pkg, n] of Object.entries(counts)) {
      const count = num(n);
      if (count <= 0) continue;
      perPkg.set(pkg, (perPkg.get(pkg) ?? 0) + count);
      total += count;
    }
  }
  const top = [...perPkg.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([pkg, count]) => ({ pkg, count }));
  return { notificationsTotal: total, notificationsTop: top };
}

/**
 * Collapses one day of raw phone signal events (ascending or not) into the numbers the UI shows.
 * State kinds (screen, network, dnd, audio, battery) become intervals ending at the next change
 * or at `nowMs`; counters (steps, notif, traffic, unlock) are summed.
 */
export function summarizeDeviceSignals(
  rows: DeviceSignalEventRow[],
  nowMs: number,
): DeviceSignalsDaySummary {
  const byKind = (kind: string) => rows.filter((r) => r.kind === kind);
  const screen = summarizeScreen(rows, nowMs);
  const network = toIntervals(rows, 'network', nowMs);
  const dnd = toIntervals(rows, 'dnd', nowMs);
  const audio = toIntervals(rows, 'audio', nowMs);
  const battery = toIntervals(rows, 'battery', nowMs);
  const wifi = (label: string) => sumMs(network, (p) => p.t === 'wifi' && p.lbl === label);

  const levels = byKind('battery').map((r) => num(asRecord(r.payload).lvl)).filter((v) => v > 0);
  const latestBattery = battery.length > 0 ? battery[battery.length - 1].payload : null;
  const lux = byKind('light').map((r) => num(asRecord(r.payload).lux));
  let mobileBytes = 0;
  let totalBytes = 0;
  for (const r of byKind('traffic')) {
    const p = asRecord(r.payload);
    mobileBytes += num(p.mrx) + num(p.mtx);
    totalBytes += num(p.trx) + num(p.ttx);
  }

  return {
    eventCount: rows.length,
    steps: byKind('steps').reduce((acc, r) => acc + num(asRecord(r.payload).d), 0),
    unlocks: byKind('unlock').length,
    ...screen,
    batteryLevel: latestBattery ? num(latestBattery.lvl) : null,
    batteryMin: levels.length > 0 ? Math.min(...levels) : null,
    charging: latestBattery ? latestBattery.chg === true : null,
    chargingMinutes: minutes(sumMs(battery, (p) => p.chg === true)),
    homeWifiMinutes: minutes(wifi('home')),
    workWifiMinutes: minutes(wifi('work')),
    otherWifiMinutes: minutes(wifi('other') + sumMs(network, (p) => p.t === 'wifi' && !p.lbl)),
    cellularMinutes: minutes(sumMs(network, (p) => p.t === 'cell')),
    offlineMinutes: minutes(sumMs(network, (p) => p.t === 'none')),
    dndMinutes: minutes(sumMs(dnd, (p) => p.f !== 'all' && p.f !== 'unknown')),
    headphonesMinutes: minutes(sumMs(audio, (p) => p.out === 'bt' || p.out === 'wired')),
    ...summarizeNotifications(rows),
    avgLux: lux.length > 0 ? Math.round(lux.reduce((a, b) => a + b, 0) / lux.length) : null,
    lightSamples: lux.length,
    mobileMb: Math.round(mobileBytes / 1_048_576),
    totalMb: Math.round(totalBytes / 1_048_576),
  };
}
