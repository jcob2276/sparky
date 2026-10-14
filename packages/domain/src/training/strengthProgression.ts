/**
 * @file strengthProgression.ts
 * @role Obliczenia progresji siły (1RM Progression & Strength Trend) w stylu Bevel Health / Strong.
 * Modeluje szacowany ciężar maksymalny (e1RM), relację do celów siłowych i rekomendacje mikropostępów.
 */

export type CoreLiftKey = 'bench_press' | 'squat' | 'deadlift' | 'overhead_press' | 'pull_up';

export interface LiftSessionRecord {
  date: string;
  weightKg: number;
  reps: number;
  rir?: number | null;
}

export interface LiftConfig {
  key: CoreLiftKey;
  name: string;
  target1RM: number; // kg
  history: LiftSessionRecord[];
}

export type LiftStatus = 'progressing' | 'plateau' | 'target_reached' | 'deload_recommended';

export interface LiftProgressSummary {
  key: CoreLiftKey;
  name: string;
  current1RM: number;
  allTime1RM: number;
  target1RM: number;
  progressPercentage: number; // np. 85% celu
  deltaVsPreviousPct: number;  // np. +3.2%
  recommendedNextWeightKg: number;
  status: LiftStatus;
  historyCount: number;
}

export interface OverallStrengthSummary {
  lifts: LiftProgressSummary[];
  averageProgressPercentage: number;
  bigThreeTotal1RM: number; // Squat + Bench + Deadlift
  relativeStrengthRatio: number | null; // Big 3 Total / Masa ciała
  totalRecordsAchieved: number;
  overallStatus: 'advancing' | 'consolidating' | 'needs_deload';
}

/**
 * Szacuje 1RM wg wzoru Epleya z opcjonalną korektą o RIR (Reps in Reserve).
 * 1RM = weight * (1 + (reps + rir) / 30) dla reps > 1.
 */
export function estimate1RM(weightKg: number, reps: number, rir = 0): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  const effectiveReps = reps + Math.max(0, rir);
  if (effectiveReps <= 1) return Math.round(weightKg * 10) / 10;
  const raw1RM = weightKg * (1 + effectiveReps / 30);
  return Math.round(raw1RM * 10) / 10;
}

/**
 * Analizuje progresję pojedynczego boju siłowego.
 */
export function analyzeLiftProgression(config: LiftConfig): LiftProgressSummary {
  const { key, name, target1RM, history } = config;

  if (!history || history.length === 0) {
    return {
      key,
      name,
      current1RM: 0,
      allTime1RM: 0,
      target1RM,
      progressPercentage: 0,
      deltaVsPreviousPct: 0,
      recommendedNextWeightKg: Math.round(target1RM * 0.6),
      status: 'progressing',
      historyCount: 0,
    };
  }

  // Oblicz 1RM dla każdej sesji
  const e1rmList = history.map((session) => estimate1RM(session.weightKg, session.reps, session.rir || 0));
  const current1RM = e1rmList[e1rmList.length - 1] || 0;
  const allTime1RM = Math.max(...e1rmList, 0);

  const prev1RM = e1rmList.length >= 2 ? e1rmList[e1rmList.length - 2] : current1RM;
  const deltaVsPreviousPct = prev1RM > 0
    ? Math.round(((current1RM - prev1RM) / prev1RM) * 1000) / 10
    : 0;

  const progressPercentage = target1RM > 0
    ? Math.min(150, Math.round((current1RM / target1RM) * 100))
    : 0;

  // Zalecany ciężar roboczy (progresywne przeciążenie +2.5 kg)
  const lastSession = history[history.length - 1];
  let recommendedNextWeightKg = lastSession ? lastSession.weightKg : Math.round(target1RM * 0.7);

  let status: LiftStatus = 'progressing';
  if (current1RM >= target1RM && target1RM > 0) {
    status = 'target_reached';
    recommendedNextWeightKg += 2.5;
  } else if (e1rmList.length >= 3) {
    const last3 = e1rmList.slice(-3);
    const isStalled = Math.max(...last3) - Math.min(...last3) < 1.0;
    if (isStalled) {
      status = 'plateau';
    } else if (deltaVsPreviousPct > 0) {
      status = 'progressing';
      recommendedNextWeightKg += 2.5;
    }
  } else if (deltaVsPreviousPct > 0) {
    recommendedNextWeightKg += 2.5;
  }

  return {
    key,
    name,
    current1RM,
    allTime1RM,
    target1RM,
    progressPercentage,
    deltaVsPreviousPct,
    recommendedNextWeightKg: Math.round(recommendedNextWeightKg * 10) / 10,
    status,
    historyCount: history.length,
  };
}

/**
 * Zbiorcze podsumowanie siły i stosunku do masy ciała (Big 3 Total).
 */
export function summarizeStrengthProgression(
  lifts: LiftConfig[],
  bodyWeightKg?: number
): OverallStrengthSummary {
  const summaries = lifts.map(analyzeLiftProgression);

  const totalProgress = summaries.reduce((sum, l) => sum + l.progressPercentage, 0);
  const averageProgressPercentage = summaries.length > 0
    ? Math.round(totalProgress / summaries.length)
    : 0;

  // Big 3: bench_press + squat + deadlift
  const bigThreeLifts = summaries.filter((l) =>
    l.key === 'bench_press' || l.key === 'squat' || l.key === 'deadlift'
  );
  const bigThreeTotal1RM = Math.round(
    bigThreeLifts.reduce((sum, l) => sum + l.current1RM, 0)
  );

  const relativeStrengthRatio = bodyWeightKg && bodyWeightKg > 0 && bigThreeTotal1RM > 0
    ? Math.round((bigThreeTotal1RM / bodyWeightKg) * 100) / 100
    : null;

  const totalRecordsAchieved = summaries.filter(
    (l) => l.current1RM > 0 && l.current1RM >= l.allTime1RM
  ).length;

  let overallStatus: 'advancing' | 'consolidating' | 'needs_deload' = 'advancing';
  const plateauCount = summaries.filter((l) => l.status === 'plateau').length;
  if (plateauCount >= 2) {
    overallStatus = 'needs_deload';
  } else if (plateauCount === 1) {
    overallStatus = 'consolidating';
  }

  return {
    lifts: summaries,
    averageProgressPercentage,
    bigThreeTotal1RM,
    relativeStrengthRatio,
    totalRecordsAchieved,
    overallStatus,
  };
}
