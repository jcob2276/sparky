import type { ExerciseHistoryRow } from './workout';
import {
  linearTrendSlope,
  rirAdjustedE1rm,
  rollingMax,
  TREND_LABEL_PL,
  type TrendLabel,
} from '@vanguard/domain';
import {
  computeExerciseSuggestion,
} from './exerciseSuggestion';
import type { WeightSuggestion } from './progression';

type ProgressTrackMode = 'weighted' | 'bodyweight';

interface ExerciseSetDetail {
  setNumber: number;
  weight: number;
  reps: number;
  rir: number | null;
}

export interface ExerciseSessionSummary {
  date: string;
  setsLabel: string;
  headline: string;
  e1rm: number | null;
  sets: ExerciseSetDetail[];
}

export interface ExerciseProgressSummary {
  exerciseName: string;
  mode: ProgressTrackMode;
  sessionCount: number;
  daysSinceLast: number | null;
  sessions: ExerciseSessionSummary[];
  chartPoints: Array<{ date: string; e1rm: number }>;
  bestE1rm: number | null;
  latestE1rm: number | null;
  e1rmDeltaVsPrev: number | null;
  rollingMaxE1rm: number | null;
  trendLabel: TrendLabel;
  trendSlopePct: number | null;
  suggestion: WeightSuggestion | null;
  insight: string;
}

export function formatWeightLabel(weight: number): string {
  return weight === 0 ? 'BW' : `${weight} kg`;
}

function groupBySession(rows: ExerciseHistoryRow[]): Map<string, { date: string; sets: ExerciseHistoryRow[] }> {
  const map = new Map<string, { date: string; sets: ExerciseHistoryRow[] }>();
  for (const row of rows) {
    if (!row.session_id) continue;
    const date = row.workout_sessions?.date ?? '';
    if (!map.has(row.session_id)) map.set(row.session_id, { date, sets: [] });
    map.get(row.session_id)!.sets.push(row);
  }
  return map;
}

function toSetDetails(sets: ExerciseHistoryRow[]): ExerciseSetDetail[] {
  return [...sets]
    .sort((a, b) => (a.set_number ?? 0) - (b.set_number ?? 0))
    .map((s) => ({
      setNumber: s.set_number ?? 0,
      weight: Number(s.weight) || 0,
      reps: Number(s.reps) || 0,
      rir: s.rir != null ? Number(s.rir) : null,
    }))
    .filter((s) => s.reps > 0);
}

export function formatSetsLabel(sets: ExerciseHistoryRow[]): string {
  const sorted = [...sets].sort((a, b) => (a.set_number ?? 0) - (b.set_number ?? 0));
  const w = sorted.map((s) => Number(s.weight));
  const r = sorted.map((s) => Number(s.reps));
  const sameW = new Set(w).size === 1;
  if (sameW && w[0] !== undefined) {
    const weightLabel = formatWeightLabel(w[0]);
    const rir = sorted.map((s) => (s.rir != null ? `@${s.rir}` : '')).join(' ').trim();
    return `${weightLabel} × ${r.join(' / ')}${rir ? ` ${rir}` : ''}`;
  }
  return sorted
    .filter((s) => Number(s.reps) > 0)
    .map((s) => `${formatWeightLabel(Number(s.weight))}×${s.reps}`)
    .join(' · ');
}

function sessionHeadline(sets: ExerciseHistoryRow[]): string {
  const details = toSetDetails(sets);
  if (!details.length) return '—';

  const weighted = details.filter((s) => s.weight > 0);
  if (weighted.length) {
    const maxW = Math.max(...weighted.map((s) => s.weight));
    const top = weighted.filter((s) => s.weight === maxW);
    const reps = top.map((s) => s.reps);
    const minR = Math.min(...reps);
    const maxR = Math.max(...reps);
    const rir = top.find((s) => s.rir != null)?.rir;
    const repStr = minR === maxR ? `${minR}` : `${minR}–${maxR}`;
    return rir != null ? `${maxW} kg × ${repStr} @RIR ${rir}` : `${maxW} kg × ${repStr}`;
  }

  const maxReps = Math.max(...details.map((s) => s.reps));
  const topBw = details.filter((s) => s.reps === maxReps);
  if (topBw.length > 1) return `BW × ${maxReps} (${topBw.length} ser.)`;
  return `BW × ${maxReps}`;
}

function sessionE1rm(sets: ExerciseHistoryRow[]): number | null {
  let best: number | null = null;
  for (const s of sets) {
    const w = Number(s.weight) || 0;
    const r = Number(s.reps) || 0;
    if (r <= 0) continue;
    const e = w > 0
      ? rirAdjustedE1rm(w, r, s.rir != null ? Number(s.rir) : null)
      : null;
    if (e != null && (best == null || e > best)) best = e;
  }
  return best;
}

function detectMode(lastSessionSets: ExerciseHistoryRow[]): ProgressTrackMode {
  const working = lastSessionSets.filter((s) => Number(s.reps) > 0);
  if (!working.length) return 'bodyweight';
  return working.some((s) => Number(s.weight) > 0) ? 'weighted' : 'bodyweight';
}

function daysBetween(dateStr: string, today = new Date()): number {
  const d = new Date(`${dateStr}T12:00:00`);
  return Math.round((today.getTime() - d.getTime()) / 86400000);
}

function buildInsight(
  mode: ProgressTrackMode,
  sessions: ExerciseSessionSummary[],
  suggestion: ReturnType<typeof computeExerciseSuggestion>,
  sessionCount: number,
  daysSinceLast: number | null,
): string {
  if (sessionCount === 0) return 'Brak historii — po pierwszym logu zobaczysz tu trend i sugestię ciężaru.';

  const last = sessions[0];
  if (!last) return '';

  const when =
    daysSinceLast === 0
      ? 'dziś'
      : daysSinceLast === 1
        ? 'wczoraj'
        : daysSinceLast != null
          ? `${daysSinceLast} dni temu`
          : '';

  if (mode === 'bodyweight' && suggestion?.mode === 'reps') {
    const action =
      suggestion.reps.action === 'progress'
        ? `Następnym razem spróbuj ${suggestion.reps.suggestedReps} powt. BW`
        : suggestion.reps.action === 'regress'
          ? `Rozważ ${suggestion.reps.suggestedReps} powt. BW`
          : `Trzymaj ${suggestion.reps.lastReps} powt. BW`;
    return when ? `${action} · ostatnia sesja ${when}` : action;
  }

  if (suggestion && (suggestion.mode === 'weight' || suggestion.mode === 'belt')) {
    const w = suggestion.weight;
    const belt = suggestion.mode === 'belt' ? ' (belt)' : '';
    const action =
      w.action === 'progress'
        ? `Następnym razem spróbuj ${w.suggestedWeight} kg${belt}`
        : w.action === 'regress'
          ? `Rozważ ${w.suggestedWeight} kg${belt}`
          : `Trzymaj ${w.lastWeight} kg${belt}`;
    return when ? `${action} · ostatnia sesja ${when}` : action;
  }

  if (mode === 'bodyweight') {
    return when
      ? `Ostatnio ${when}: ${last.headline}. Progres = więcej powtórzeń lub cięższy dip belt.`
      : `Ostatnio: ${last.headline}.`;
  }

  return when ? `Ostatnia sesja ${when}: ${last.headline}` : `Ostatnia sesja: ${last.headline}`;
}

export function buildExerciseProgress(
  exerciseName: string,
  rows: ExerciseHistoryRow[],
  muscleTags: string[] = [],
  sessionLimit = 6,
): ExerciseProgressSummary {
  const bySession = groupBySession(rows);
  const ordered = [...bySession.entries()]
    .map(([, v]) => ({
      date: v.date,
      sets: [...v.sets].sort((a, b) => (a.set_number ?? 0) - (b.set_number ?? 0)),
    }))
    .filter((s) => s.date)
    .sort((a, b) => b.date.localeCompare(a.date));

  const sessionCount = ordered.length;
  const daysSinceLast = ordered[0]?.date ? daysBetween(ordered[0].date) : null;
  const mode = detectMode(ordered[0]?.sets ?? []);

  const sessions: ExerciseSessionSummary[] = ordered.slice(0, sessionLimit).map((s) => ({
    date: s.date,
    setsLabel: formatSetsLabel(s.sets),
    headline: sessionHeadline(s.sets),
    e1rm: sessionE1rm(s.sets),
    sets: toSetDetails(s.sets),
  }));

  const chartPoints = ordered
    .map((s) => ({ date: s.date, e1rm: sessionE1rm(s.sets) }))
    .filter((p): p is { date: string; e1rm: number } => p.e1rm != null)
    .reverse()
    .slice(-10);

  const e1rmSeries = ordered
    .map((s) => sessionE1rm(s.sets))
    .filter((v): v is number => v != null);
  const bestE1rm = e1rmSeries.length ? Math.max(...e1rmSeries) : null;
  const latestE1rm = sessions[0]?.e1rm ?? null;

  const e1rmDeltaVsPrev =
    e1rmSeries.length >= 3 && latestE1rm != null && e1rmSeries[1] > 0
      ? ((latestE1rm - e1rmSeries[1]) / e1rmSeries[1]) * 100
      : e1rmSeries.length >= 2 && latestE1rm != null
        ? ((latestE1rm - e1rmSeries[1]) / e1rmSeries[1]) * 100
        : null;

  const trend = linearTrendSlope([...e1rmSeries].reverse());
  const rollingMaxE1rm = rollingMax(e1rmSeries, 4);

  const lastSessionSets = ordered[0]?.sets ?? null;
  const suggestion = computeExerciseSuggestion(lastSessionSets, exerciseName, muscleTags);

  const insight = buildInsight(mode, sessions, suggestion, sessionCount, daysSinceLast);

  const weightSuggestion =
    suggestion?.mode === 'weight' || suggestion?.mode === 'belt' ? suggestion.weight : null;

  return {
    exerciseName,
    mode,
    sessionCount,
    daysSinceLast,
    sessions,
    chartPoints,
    bestE1rm,
    latestE1rm,
    e1rmDeltaVsPrev,
    rollingMaxE1rm,
    trendLabel: trend?.label ?? 'insufficient',
    trendSlopePct: trend?.slopePct ?? null,
    suggestion: weightSuggestion,
    insight,
  };
}

export { TREND_LABEL_PL };

export function collectRecentExerciseNames(
  sessions: Array<{ exercise_logs?: Array<{ exercise_name: string; muscle_tags?: string[] | null }> }>,
  limit = 12,
): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const session of sessions) {
    for (const log of session.exercise_logs ?? []) {
      const name = log.exercise_name?.trim();
      if (!name) continue;
      const tags = log.muscle_tags ?? [];
      if (tags.includes('wellness') || tags.includes('activity')) continue;
      if (seen.has(name)) continue;
      seen.add(name);
      names.push(name);
    }
  }
  return names.slice(0, limit);
}
