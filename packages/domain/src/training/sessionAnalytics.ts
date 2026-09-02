import { isHardSet } from './setMetrics.ts';

export type SetLogLike = {
  weight?: number | null;
  reps?: number | null;
  rir?: number | null;
  set_number?: number | null;
  muscle_tags?: string[] | null;
  exercise_name?: string | null;
};

export type SessionLogLike = {
  date: string;
  session_rpe?: number | null;
  exercise_logs?: SetLogLike[] | null;
};

export type AcwrBand = 'undertrained' | 'optimal' | 'elevated' | 'spike_risk';

export function acwrBand(ratio: number): AcwrBand {
  if (ratio < 0.8) return 'undertrained';
  if (ratio <= 1.3) return 'optimal';
  if (ratio <= 1.5) return 'elevated';
  return 'spike_risk';
}

export const ACWR_BAND_LABELS: Record<AcwrBand, string> = {
  undertrained: 'niedotrenowanie (<0.8)',
  optimal: 'sweet spot (0.8–1.3)',
  elevated: 'podwyższony (1.3–1.5)',
  spike_risk: 'spike (>1.5)',
};

export function computeAcwr(
  strainRows: Array<{ date: string; strain_score?: number | null }>,
  acuteDays = 7,
  chronicDays = 28,
  minChronicDays = 14,
): {
  acuteLoad: number | null;
  chronicLoad: number | null;
  acwr: number | null;
  band: AcwrBand | null;
  monotony: number | null;
} {
  const scores = strainRows
    .filter((r) => r.strain_score != null && !Number.isNaN(Number(r.strain_score)))
    .map((r) => ({ date: r.date, score: Number(r.strain_score) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!scores.length) {
    return { acuteLoad: null, chronicLoad: null, acwr: null, band: null, monotony: null };
  }

  const acute = scores.slice(-acuteDays);
  const acuteLoad = acute.reduce((s, r) => s + r.score, 0) / acute.length;

  const chronic =
    scores.length >= minChronicDays ? scores.slice(-chronicDays) : null;
  const chronicLoad = chronic
    ? chronic.reduce((s, r) => s + r.score, 0) / chronic.length
    : null;

  const acwr =
    chronicLoad != null && chronicLoad > 0
      ? Math.round((acuteLoad / chronicLoad) * 100) / 100
      : null;

  let monotony: number | null = null;
  if (acute.length >= 4) {
    const mean = acuteLoad;
    const variance =
      acute.reduce((s, r) => s + (r.score - mean) ** 2, 0) / (acute.length - 1);
    const sd = Math.sqrt(variance);
    if (sd > 0) monotony = Math.round((mean / sd) * 100) / 100;
  }

  return {
    acuteLoad: Math.round(acuteLoad * 10) / 10,
    chronicLoad: chronicLoad != null ? Math.round(chronicLoad * 10) / 10 : null,
    acwr,
    band: acwr != null ? acwrBand(acwr) : null,
    monotony,
  };
}

export function creditHardSetToTags(
  tags: string[],
  stimulus: Record<string, { direct?: number; indirect?: number }> | null,
): Record<string, number> {
  if (stimulus && Object.keys(stimulus).length > 0) {
    const total = Object.values(stimulus).reduce(
      (s, v) => s + (v.direct ?? 0) + (v.indirect ?? 0),
      0,
    );
    if (total > 0) {
      const out: Record<string, number> = {};
      for (const [tag, v] of Object.entries(stimulus)) {
        out[tag] = ((v.direct ?? 0) + (v.indirect ?? 0)) / total;
      }
      return out;
    }
  }
  if (!tags.length) return {};
  const share = 1 / tags.length;
  return Object.fromEntries(tags.map((t) => [t, share]));
}

export interface HardSetsWeekBucket {
  weekStart: string;
  label: string;
  byTag: Record<string, number>;
  total: number;
}

export function aggregateHardSetsByWeek(
  sessions: SessionLogLike[],
  weekStarts: string[],
  creditForLog: (log: SetLogLike) => Record<string, number>,
  skipTags: string[] = ['wellness', 'activity', 'cardio', 'plyo'],
): HardSetsWeekBucket[] {
  const skip = new Set(skipTags);

  return weekStarts.map((weekStart, idx) => {
    const weekEnd = weekStarts[idx + 1] ?? '9999-99-99';
    const byTag: Record<string, number> = {};
    let total = 0;

    for (const session of sessions) {
      if (session.date < weekStart || session.date >= weekEnd) continue;
      for (const log of session.exercise_logs ?? []) {
        const reps = Number(log.reps) || 0;
        if (reps <= 0) continue;
        if (!isHardSet(log.rir != null ? Number(log.rir) : null)) continue;

        const credit = creditForLog(log);
        for (const [tag, fraction] of Object.entries(credit)) {
          if (skip.has(tag)) continue;
          byTag[tag] = (byTag[tag] ?? 0) + fraction;
          total += fraction;
        }
      }
    }

    return {
      weekStart,
      label: weekStart.slice(5),
      byTag,
      total: Math.round(total * 10) / 10,
    };
  });
}

export function sessionRpeRirMismatch(
  sessionRpe: number | null | undefined,
  logs: SetLogLike[],
  deltaThreshold = 2,
): {
  flagged: boolean;
  avgRir: number | null;
  impliedRir: number | null;
  delta: number | null;
  message: string;
} | null {
  if (sessionRpe == null || Number.isNaN(sessionRpe)) return null;

  const rirs: number[] = [];
  for (const log of logs) {
    if ((Number(log.reps) || 0) <= 0) continue;
    if (log.rir == null || Number.isNaN(Number(log.rir))) continue;
    rirs.push(Number(log.rir));
  }
  if (!rirs.length) return null;

  const avgRir = rirs.reduce((s, v) => s + v, 0) / rirs.length;
  const impliedRir = Math.max(0, 10 - sessionRpe);
  const delta = Math.abs(impliedRir - avgRir);
  const flagged = delta >= deltaThreshold;

  const message = flagged
    ? `RPE sesji (${sessionRpe}) vs śr. RIR z logów (${avgRir.toFixed(1)}) — rozjazd ${delta.toFixed(1)}`
    : `RPE sesji zgodne ze śr. RIR (${avgRir.toFixed(1)})`;

  return {
    flagged,
    avgRir: Math.round(avgRir * 10) / 10,
    impliedRir: Math.round(impliedRir * 10) / 10,
    delta: Math.round(delta * 10) / 10,
    message,
  };
}

export function intraSessionFatigueIndex(
  sets: SetLogLike[],
): {
  index: number;
  repDropPct: number;
  weight: number;
  firstReps: number;
  lastReps: number;
  message: string;
} | null {
  const working = [...sets]
    .filter((s) => (Number(s.reps) || 0) > 0)
    .sort((a, b) => (a.set_number ?? 0) - (b.set_number ?? 0));

  const weighted = working.filter((s) => (Number(s.weight) || 0) > 0);
  if (weighted.length < 2) return null;

  const topWeight = Math.max(...weighted.map((s) => Number(s.weight)));
  const atWeight = weighted.filter((s) => Number(s.weight) === topWeight);
  if (atWeight.length < 2) return null;

  const firstReps = Number(atWeight[0].reps);
  const lastReps = Number(atWeight[atWeight.length - 1].reps);
  if (firstReps <= 0) return null;

  const repDropPct = Math.round(((firstReps - lastReps) / firstReps) * 1000) / 10;
  const index = Math.min(100, Math.max(0, repDropPct));
  const message =
    repDropPct >= 15
      ? `Spadek ${repDropPct}% powt. przy ${topWeight} kg (${firstReps}→${lastReps})`
      : repDropPct >= 5
        ? `Lekki spadek przy ${topWeight} kg (${firstReps}→${lastReps})`
        : `Stabilne powtórzenia przy ${topWeight} kg`;

  return { index, repDropPct, weight: topWeight, firstReps, lastReps, message };
}

export type TrendLabel = 'rising' | 'plateau' | 'falling' | 'insufficient';

export function linearTrendSlope(
  values: number[],
  minPoints = 3,
  plateauPctPerSession = 0.5,
): { slope: number; slopePct: number; label: TrendLabel } | null {
  const pts = values.filter((v) => Number.isFinite(v));
  if (pts.length < minPoints) return { slope: 0, slopePct: 0, label: 'insufficient' };

  const n = pts.length;
  const meanX = (n - 1) / 2;
  const meanY = pts.reduce((s, v) => s + v, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - meanX) * (pts[i] - meanY);
    den += (i - meanX) ** 2;
  }
  const slope = den > 0 ? num / den : 0;
  const slopePct = meanY > 0 ? (slope / meanY) * 100 : 0;

  let label: TrendLabel = 'plateau';
  if (slopePct > plateauPctPerSession) label = 'rising';
  else if (slopePct < -plateauPctPerSession) label = 'falling';

  return {
    slope: Math.round(slope * 100) / 100,
    slopePct: Math.round(slopePct * 10) / 10,
    label,
  };
}

export function rollingMax(values: number[], window: number): number | null {
  const slice = values.filter(Number.isFinite).slice(0, window);
  return slice.length ? Math.max(...slice) : null;
}

export const TREND_LABEL_PL: Record<TrendLabel, string> = {
  rising: 'wzrost',
  plateau: 'płasko',
  falling: 'spadek',
  insufficient: 'za mało danych',
};
