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

export function buildFitnessBreakdowns(p: FitnessBreakdownsParams): DimensionBreakdown[] {
  return [
    {
      key: 'consistency',
      label: 'Regularność',
      score: p.consistencyScore,
      group: 'process',
      detail:
        `${p.trainingSessions7d} sesji siłowych + ${p.strava7d} cardio (7 dni). Nawyki — ${p.habitSummaryLabel}` +
        (p.habitSlotTotal > 0
          ? ` (łącznie ${p.habitSuccessTotal}/${p.habitSlotTotal}, ${Math.round(p.habitRate * 100)}%).`
          : '.') +
        ` Wzór: (trening + cardio) × 1,5 + nawyki × 4.` +
        (p.saunaCount7d > 0
          ? ` Sauna: ${p.saunaCount7d}× / ${p.saunaMinutes7d} min — liczy się w „Regeneracja & wellness", nie w regularności.`
          : ' Sauna/wellness liczy się osobno w „Regeneracja & wellness".'),
    },
    {
      key: 'endurance',
      label: 'Wydolność',
      score: p.enduranceScore,
      group: 'capability',
      detail:
        p.cooperPts.score > 0
          ? `Strava 7d → ${p.aerobicPoints.toFixed(1)} pkt (${p.cardioSummary}). ${p.cooperPts.detail} Blend: 55% tyg. + 45% max Cooper.`
          : `Strava 7d → ${p.aerobicPoints.toFixed(1)} pkt (${p.cardioSummary}). Bieg × 0,4/km, marsz × 0,15/km, reszta × 0,05/min.`,
    },
    {
      key: 'strength',
      label: 'Siła',
      score: p.strengthScore,
      group: 'capability',
      detail:
        p.capacity.score > 0
          ? `Ostatnie 14 dni: ${p.workouts14d.length} sesji, ${p.qualitySets14d} serii jakościowych, śr. RPE ${p.avgRpe14d.toFixed(1)} → ${p.recentStrengthScore.toFixed(1)}/10. Kapitał (maxy ×BW, decay do 3 lat): ${p.capacity.detail} Blend: 40% ostatnie + 60% maxy.`
          : p.workouts14d.length > 0
            ? `${p.workouts14d.length} sesji (14 dni), ${p.qualitySets14d} serii blisko max (MSP/PWS lub RIR≤1), śr. RPE ${p.avgRpe14d.toFixed(1)}. Brak maxów w historii — liczy się tylko ostatnia praca.`
            : 'Brak sesji siłowych w ostatnich 14 dniach.',
    },
    {
      key: 'habits',
      label: 'Regeneracja & wellness',
      score: p.habitsScore,
      group: 'process',
      detail:
        (p.bodyBonus.detail ? `${p.bodyBonus.detail}. ` : '') +
        (p.saunaCount7d > 0
          ? `Sen: śr. ${p.avgSleepScore.toFixed(0)}/100. Białko ≥${p.resolvedProteinG} g: ${p.proteinDays}/7 dni (${Math.round(p.proteinTargetMetRate * 100)}%). Sauna: ${p.saunaCount7d}× / ${p.saunaMinutes7d} min → +${p.saunaPoints.toFixed(1)} pkt.`
          : `Sen: śr. ${p.avgSleepScore.toFixed(0)}/100. Białko ≥${p.resolvedProteinG} g: ${p.proteinDays}/7 dni (${Math.round(p.proteinTargetMetRate * 100)}%). Sauna: brak w 7 dniach.`),
    },
    {
      key: 'progress',
      label: 'Adaptacja',
      score: p.progressScore,
      group: 'process',
      detail:
        p.first7dHRV != null && p.last7dHRV != null
          ? `Trendy 7 vs poprzednie 7 dni — HRV: ${p.last7dHRV.toFixed(0)} vs ${p.first7dHRV.toFixed(0)} ms (${p.hrvTrend > 0 ? '+1,5' : '−1'}), readiness: ${p.avgReadiness7d?.toFixed(0) ?? '—'} vs ${p.avgReadinessPrev7d?.toFixed(0) ?? '—'} (${p.readinessTrend >= 0 ? '+' : ''}${p.readinessTrend}), aktywność: ${p.activity7d} vs ${p.activityPrev7d} sesji/cardio (${p.activityTrend >= 0 ? '+' : ''}${p.activityTrend}). To nie są zadania kariery — tylko sygnały regeneracji i obciążenia.`
          : `Aktywność 7d: ${p.activity7d} vs poprzednie ${p.activityPrev7d}. Brak pełnych danych HRV do porównania tygodni.`,
    },
    {
      key: 'volume',
      label: 'Obciążenie tygodnia',
      score: p.volumeScore,
      group: 'process',
      detail: `Hybrydowe obciążenie bieżącego tygodnia: ${p.loadSummary}. Wzór: Mg siłowo (max 3,5) + km biegu (max 3,5) + marsz/min inne (max 2) + baza 1.`,
    },
  ];
}
