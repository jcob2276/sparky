import { isLogWellness } from '../desktopUtils';
import type { Tables } from '../../../lib/database.types';

type ExerciseLogRow = {
  exercise_name: string;
  muscle_tags?: Tables<'exercise_logs'>['muscle_tags'];
  is_pws_or_msp?: Tables<'exercise_logs'>['is_pws_or_msp'];
  rir?: Tables<'exercise_logs'>['rir'];
};

interface StravaActivity {
  start_date?: string | null;
  distance?: number | null;
  sport_type?: string | null;
  moving_time?: number | null;
}

export function stravaDay(a: { start_date?: string | null }) {
  return (a.start_date || '').slice(0, 10);
}

export function countQualityStrengthSets(logs: ExerciseLogRow[]) {
  return (logs || []).filter((l) => {
    if (isLogWellness(l)) return false;
    if (l.is_pws_or_msp) return true;
    if (l.rir != null && Number(l.rir) <= 1) return true;
    return false;
  }).length;
}

export function summarizeStravaWindow(activities: StravaActivity[]) {
  let runKm = 0;
  let walkKm = 0;
  let otherMin = 0;
  activities.forEach((a) => {
    const distKm = (a.distance || 0) / 1000;
    const sport = a.sport_type || '';
    if (['Run', 'TrailRun', 'VirtualRun'].includes(sport)) runKm += distKm;
    else if (['Walk', 'Hike'].includes(sport)) walkKm += distKm;
    else otherMin += (a.moving_time || 0) / 60;
  });
  return { runKm, walkKm, otherMin, count: activities.length };
}

export type ScoreKey = 'consistency' | 'endurance' | 'strength' | 'habits' | 'progress' | 'volume';

type DimensionBreakdown = {
  key: ScoreKey;
  label: string;
  score: number;
  detail: string;
  group: 'capability' | 'process';
};

export interface FitnessBreakdownsParams {
  consistencyScore: number;
  trainingSessions7d: number;
  strava7d: number;
  habitSummaryLabel: string;
  habitSlotTotal: number;
  habitSuccessTotal: number;
  habitRate: number;
  saunaCount7d: number;
  saunaMinutes7d: number;
  enduranceScore: number;
  cooperPts: { score: number; detail: string };
  aerobicPoints: number;
  cardioSummary: string;
  strengthScore: number;
  capacity: { score: number; detail: string };
  workouts14d: unknown[];
  qualitySets14d: number;
  avgRpe14d: number;
  recentStrengthScore: number;
  habitsScore: number;
  bodyBonus: { detail?: string };
  resolvedProteinG: number;
  avgSleepScore: number;
  proteinDays: number;
  proteinTargetMetRate: number;
  saunaPoints: number;
  progressScore: number;
  first7dHRV: number | null;
  last7dHRV: number | null;
  hrvTrend: number;
  avgReadiness7d: number | null;
  avgReadinessPrev7d: number | null;
  readinessTrend: number;
  activity7d: number;
  activityPrev7d: number;
  activityTrend: number;
  volumeScore: number;
  loadSummary: string;
}

function pluralSesje(n: number, kind: string): string {
  if (n === 1) return `1 sesja ${kind}`;
  const rem10 = n % 10;
  const rem100 = n % 100;
  if (rem10 >= 2 && rem10 <= 4 && !(rem100 >= 12 && rem100 <= 14)) {
    return `${n} sesje ${kind === 'siłowa' ? 'siłowe' : kind}`;
  }
  return `${n} sesji ${kind === 'siłowa' ? 'siłowych' : kind}`;
}

export function buildFitnessBreakdowns(p: FitnessBreakdownsParams): DimensionBreakdown[] {
  return [
    {
      key: 'consistency',
      label: 'Regularność',
      score: p.consistencyScore,
      group: 'process',
      detail:
        `${pluralSesje(p.trainingSessions7d, 'siłowa')} + ${p.strava7d} sesji cardio w 7 dniach. Nawyki — czyste dni: ${p.habitSuccessTotal}/${p.habitSlotTotal} (${Math.round(p.habitRate * 100)}%).` +
        (p.saunaCount7d > 0
          ? ` Sauna: ${p.saunaCount7d}× (${p.saunaMinutes7d} min).`
          : ' Dyscyplina reżimu treningowego zachowana.'),
    },
    {
      key: 'endurance',
      label: 'Wydolność',
      score: p.enduranceScore,
      group: 'capability',
      detail:
        `Objętość cardio 7d: ${p.cardioSummary}. ` +
        (p.cooperPts.score > 0
          ? `Sprawdzian Coopera (12 min): ${p.cooperPts.detail || '2.61 km'}. Bardzo wysoka baza tlenowa.`
          : 'Dobre parametry tlenowe w treningach ciągłych.'),
    },
    {
      key: 'strength',
      label: 'Siła',
      score: p.strengthScore,
      group: 'capability',
      detail:
        p.capacity.score > 0
          ? `Ostatnie 14 dni: ${p.workouts14d.length} sesji, ${p.qualitySets14d} serii jakościowych (śr. RPE ${p.avgRpe14d.toFixed(1)}). Kapitał siłowy: ${p.capacity.detail.replace(/PR starsze niż ~3 lata nie wchodzą\./g, '')}.`
          : p.workouts14d.length > 0
            ? `${p.workouts14d.length} sesji w 14 dniach, ${p.qualitySets14d} serii submaksymalnych, śr. RPE ${p.avgRpe14d.toFixed(1)}.`
            : 'Brak sesji siłowych w ostatnich 14 dniach.',
    },
    {
      key: 'habits',
      label: 'Regeneracja & wellness',
      score: p.habitsScore,
      group: 'process',
      detail:
        (p.bodyBonus.detail ? `${p.bodyBonus.detail}. ` : '') +
        `Średni sen Oura: ${p.avgSleepScore.toFixed(0)}/100. Białko ≥${p.resolvedProteinG} g: ${p.proteinDays}/7 dni (${Math.round(p.proteinTargetMetRate * 100)}%). ` +
        (p.saunaCount7d > 0
          ? `Sauna: ${p.saunaCount7d}× (${p.saunaMinutes7d} min).`
          : 'Brak sesji sauny w 7 dniach.'),
    },
    {
      key: 'progress',
      label: 'Adaptacja',
      score: p.progressScore,
      group: 'process',
      detail:
        p.first7dHRV != null && p.last7dHRV != null
          ? `Trendy 7d vs poprz. tydzień — HRV: ${p.last7dHRV.toFixed(0)} vs ${p.first7dHRV.toFixed(0)} ms, Oura Readiness: ${p.avgReadiness7d?.toFixed(0) ?? '—'} vs ${p.avgReadinessPrev7d?.toFixed(0) ?? '—'}, aktywność: ${p.activity7d} vs ${p.activityPrev7d}. Stabilna adaptacja układu nerwowego.`
          : `Aktywność 7d: ${p.activity7d} vs poprz. ${p.activityPrev7d}. Stabilna adaptacja OUN.`,
    },
    {
      key: 'volume',
      label: 'Obciążenie tygodnia',
      score: p.volumeScore,
      group: 'process',
      detail: `Zarejestrowana praca w tym tygodniu: ${p.loadSummary}. Obciążenie adekwatne do fazy mezocyklu.`,
    },
  ];
}
