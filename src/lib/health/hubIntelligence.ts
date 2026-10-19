/**
 * Hub Start intelligence: e1RM trend forecasts + neglect signals.
 * Data-derived estimates only — N explicit; no coaching certainty.
 */
import { epley1rm } from '@vanguard/domain';
import { normalizeMuscleTag } from './bodyMuscles';
import { MUSCLE_GROUPS } from './muscleRecovery';
import type { HubRecoverySessionRow } from './hubRecovery';
import { isStrengthLog } from './workoutDisplay';
import {
  buildHubRecords,
  daysBetween,
  isOhpName,
  LIFT_UI,
  type HubLiftRecord,
} from './hubRecords';

export type { HubLiftRecord } from './hubRecords';
export { buildHubRecords } from './hubRecords';

export type HubForecast = {
  key: string;
  displayLabel: string;
  currentE1rmKg: number;
  deltaPerWeekKg: number;
  projected4wKg: number;
  nSessions: number;
  summary: string;
};

export type HubNeglect = {
  tag: string;
  displayLabel: string;
  daysSince: number;
  volumeSharePct: number;
  reason: 'gap' | 'low_volume';
  summary: string;
};

const TAG_LABELS: Record<string, string> = {
  klatka: 'Klatka',
  plecy: 'Plecy',
  barki: 'Barki',
  biceps: 'Biceps',
  triceps: 'Triceps',
  przedramiona: 'Przedramiona',
  brzuch: 'Brzuch',
  czworogłowe: 'Czworogłowe',
  'dwugłowe ud': 'Dwugłowe',
  pośladki: 'Pośladki',
  łydki: 'Łydki',
};

const FORECAST_LIFTS: Array<{
  key: Exclude<HubLiftRecord['key'], 'pullup' | 'pushup' | 'dip'>;
  match: (n: string) => boolean;
}> = [
  {
    key: 'bench',
    match: (n) =>
      /wycisk|\bbench\b/i.test(n) &&
      !/wąsk|wask|close-grip|nad głow|nad glow|siedząc|siedzac|stojąc|stojac|\bohp\b/i.test(n),
  },
  { key: 'squat', match: (n) => /przysiad|\bsquat\b|leg press/i.test(n) },
  { key: 'deadlift', match: (n) => /martwy|\bdeadlift\b|\brdl\b|rumun/i.test(n) },
  { key: 'ohp', match: (n) => isOhpName(n) },
];

function sessionBestE1rm(row: HubRecoverySessionRow, match: (name: string) => boolean): number | null {
  let best: number | null = null;
  for (const log of row.exercise_logs || []) {
    if (!match(log.exercise_name || '')) continue;
    const w = Number(log.weight) || 0;
    const r = Number(log.reps) || 0;
    if (w <= 0 || r <= 0) continue;
    const e1rm = epley1rm(w, r) ?? (r === 1 ? w : null);
    if (e1rm == null || e1rm <= 0) continue;
    if (best == null || e1rm > best) best = e1rm;
  }
  return best;
}

/** Linear e1RM slope (kg/week). Needs N≥3 sessions; wording stays probabilistic. */
export function buildHubForecasts(
  rows: HubRecoverySessionRow[],
  _today: string,
  maxItems = 3,
): HubForecast[] {
  const chronological = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const forecasts: HubForecast[] = [];

  for (const lift of FORECAST_LIFTS) {
    const points: Array<{ date: string; e1rm: number }> = [];
    for (const row of chronological) {
      const e1rm = sessionBestE1rm(row, lift.match);
      if (e1rm != null) points.push({ date: row.date.slice(0, 10), e1rm });
    }
    if (points.length < 3) continue;

    const recent = points.slice(-8);
    const n = recent.length;
    const xs = recent.map((p) => daysBetween(recent[0].date, p.date) / 7);
    const ys = recent.map((p) => p.e1rm);
    const xMean = xs.reduce((a, b) => a + b, 0) / n;
    const yMean = ys.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i += 1) {
      num += (xs[i] - xMean) * (ys[i] - yMean);
      den += (xs[i] - xMean) ** 2;
    }
    if (den < 1e-6) continue;
    const slopePerWeek = num / den;
    if (Math.abs(slopePerWeek) < 0.15) continue;

    const current = ys[n - 1];
    const projected = Math.round((current + slopePerWeek * 4) * 10) / 10;
    const delta = Math.round(slopePerWeek * 10) / 10;
    const sign = delta > 0 ? '+' : '';
    forecasts.push({
      key: lift.key,
      displayLabel: LIFT_UI[lift.key],
      currentE1rmKg: Math.round(current * 10) / 10,
      deltaPerWeekKg: delta,
      projected4wKg: projected,
      nSessions: n,
      summary: `Estymata z trendu e1RM (N=${n}): ${sign}${delta} kg/tydz. → ~${projected} kg za 4 tyg.`,
    });
  }

  return forecasts
    .sort((a, b) => Math.abs(b.deltaPerWeekKg) - Math.abs(a.deltaPerWeekKg))
    .slice(0, maxItems);
}

/** Muscles with long gap or low volume share vs peers in the lookback window. */
export function buildHubNeglects(
  rows: HubRecoverySessionRow[],
  today: string,
  maxItems = 4,
): HubNeglect[] {
  const volumeByTag: Record<string, number> = {};
  const lastDateByTag: Record<string, string> = {};
  const sessionDaysByTag: Record<string, Set<string>> = {};

  for (const row of rows) {
    const d = row.date.slice(0, 10);
    for (const log of row.exercise_logs || []) {
      if (!isStrengthLog(log.muscle_tags)) continue;
      const w = Number(log.weight) || 0;
      const r = Number(log.reps) || 0;
      if (r <= 0) continue;
      const vol = w > 0 ? w * r : r * 20;
      for (const raw of log.muscle_tags || []) {
        const tag = normalizeMuscleTag(raw);
        if (!(MUSCLE_GROUPS as readonly string[]).includes(tag)) continue;
        volumeByTag[tag] = (volumeByTag[tag] || 0) + vol;
        if (!lastDateByTag[tag] || d > lastDateByTag[tag]) lastDateByTag[tag] = d;
        if (!sessionDaysByTag[tag]) sessionDaysByTag[tag] = new Set();
        sessionDaysByTag[tag].add(d);
      }
    }
  }

  const tags = Object.keys(volumeByTag);
  if (tags.length < 2) return [];

  const totalVol = tags.reduce((s, t) => s + volumeByTag[t], 0) || 1;
  const avgShare = 1 / tags.length;
  const out: HubNeglect[] = [];

  for (const tag of tags) {
    const daysSince = daysBetween(lastDateByTag[tag], today);
    const share = volumeByTag[tag] / totalVol;
    const sharePct = Math.round(share * 100);
    const label = TAG_LABELS[tag] || tag;
    const n = sessionDaysByTag[tag]?.size ?? 0;

    if (daysSince >= 10) {
      out.push({
        tag,
        displayLabel: label,
        daysSince,
        volumeSharePct: sharePct,
        reason: 'gap',
        summary: `${label}: ${daysSince} dni przerwy (N=${n} dni z bodźcem w oknie).`,
      });
    } else if (share < avgShare * 0.35 && sharePct <= 8) {
      out.push({
        tag,
        displayLabel: label,
        daysSince,
        volumeSharePct: sharePct,
        reason: 'low_volume',
        summary: `${label}: ${sharePct}% objętości — niski udział vs inne grupy (N=${n}).`,
      });
    }
  }

  return out
    .sort((a, b) => {
      if (a.reason !== b.reason) return a.reason === 'gap' ? -1 : 1;
      return b.daysSince - a.daysSince;
    })
    .slice(0, maxItems);
}

export function buildHubIntelligence(rows: HubRecoverySessionRow[], today: string) {
  return {
    records: buildHubRecords(rows, today),
    forecasts: buildHubForecasts(rows, today),
    neglects: buildHubNeglects(rows, today),
  };
}
