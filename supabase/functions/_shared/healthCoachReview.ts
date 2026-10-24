import { isRunSport } from '@vanguard/domain';
import { reviewHealthGoal } from './healthGoalProgress.ts';
import { dailyTrainingDecision } from './healthCoachInputs.ts';
import {
  type HealthCoachContext,
  type HealthCoachWeeklyReview,

  type WeeklyAdherence,
  type WeeklyDecisionReview,
  type NextWeekProposal,
  type CoachRow,
  formatWarsawDate,
} from "@vanguard/domain";

export interface BuildReviewInput {
  context: HealthCoachContext;
  weekStart: string;
  weekEnd: string;
  decisions?: Array<{
    id?: string;
    created_at?: string;
    decision_type?: string;
    explanation?: string;
    status?: string;
  }>;
}

export function buildHealthCoachReview(input: BuildReviewInput): HealthCoachWeeklyReview {
  const { context, weekStart, weekEnd } = input;
  const decisionsInput = input.decisions ?? [];

  // 1. Filter planned workouts within the week window
  const plannedRows = (context.sources.training_plan_workouts.value ?? []).filter((row: CoachRow) => {
    const d = String(row.planned_date ?? row.date ?? "");
    return d >= weekStart && d <= weekEnd && d <= context.localDate;
  });

  const completed = plannedRows.filter((r: CoachRow) => Boolean(r.completed));
  const skipped = plannedRows.filter((r: CoachRow) => !r.completed && Boolean(r.skipped_at));
  const unrecorded = plannedRows.filter((r: CoachRow) => !r.completed && !r.skipped_at);

  // 2. Activity totals within the week
  const runs = (context.sources.strava_activities_clean.value ?? []).filter((row: CoachRow) => {
    const d = formatWarsawDate(String(row.start_date ?? ''));
    return isRunSport(String(row.sport_type ?? '')) && d >= weekStart && d <= weekEnd && d <= context.localDate;
  });
  const totalMeters = runs.reduce((sum: number, r: CoachRow) => sum + (Number(r.distance) || 0), 0);
  const cardioKm = Math.round((totalMeters / 1000) * 10) / 10;

  const gymSessions = (context.sources.workout_sessions.value ?? []).filter((row: CoachRow) => {
    const d = String(row.session_date ?? row.date ?? "").slice(0, 10);
    return d >= weekStart && d <= weekEnd;
  });
  const strengthSets = gymSessions.reduce((sum, row) => sum + (Array.isArray(row.exercise_logs) ? row.exercise_logs.filter(log =>
    log && typeof log === 'object' && Number(log.reps)>0 && !/saun|spacer|rower|stretch|mobility|masaż/i.test(String(log.exercise_name ?? ''))).length : 0), 0);

  const plannedCount = plannedRows.length;
  const adherenceRate = plannedCount > 0 ? Math.round((completed.length / plannedCount) * 100) / 100 : null;

  const adherence: WeeklyAdherence = {
    plannedSessionsCount: plannedCount,
    completedSessionsCount: completed.length,
    skippedSessionsCount: skipped.length,
    unrecordedSessionsCount: unrecorded.length,
    cardioKm,
    strengthSets,
    adherenceRate,
    note: plannedCount === 0 ? 'Brak zapisanych sesji planu do rozliczenia w tym oknie.' : unrecorded.length > 0
      ? `${unrecorded.length} zaplanowanych sesji nie ma zapisanego wykonania w loggerze ani zgłoszenia pominięcia.`
      : "Wszystkie zaplanowane sesje posiadają status wykonania lub pominięcia.",
  };
  const failed = (source:keyof typeof context.sources) => context.sources[source].state === 'failed';
  if (failed('training_plan_workouts')) {
    adherence.plannedSessionsCount=null;adherence.completedSessionsCount=null;adherence.skippedSessionsCount=null;adherence.unrecordedSessionsCount=null;adherence.adherenceRate=null;
    adherence.note='Dane planu są niedostępne; nie można ocenić jego realizacji.';
  }
  if (failed('workout_sessions')) adherence.strengthSets=null;
  if (failed('strava_activities_clean')) adherence.cardioKm=null;

  // 3. Goal KPIs progress evaluation
  const kpiRows = context.sources.goal_kpis.value ?? [];
  const goalProgress = kpiRows.map(row=>reviewHealthGoal(row,context,weekStart,weekEnd));

  // 4. Weekly decisions compile
  const decisions: WeeklyDecisionReview[] = decisionsInput.map(d => ({
    decisionId: d.id ?? crypto.randomUUID(),
    date: (d.created_at ?? "").slice(0, 10),
    type: d.decision_type ?? "coach_decision",
    summary: d.explanation ?? "Decyzja adaptacyjna",
    applied: d.status === "applied" || d.status === "confirmed",
  }));

  // 5. Next week proposal
  let action: NextWeekProposal["action"] = "keep";
  let rationale = 'Sama realizacja kalendarza nie uzasadnia zwiększania obciążenia. Przejrzyj rzeczywiste serie, RIR i aktualną regenerację.';
  const changesSummary = ['Zachowaj aktywny plan do przeglądu wykonania; zmiana wymaga zatwierdzenia.'];
  const dailyDecision=dailyTrainingDecision(context);
  if (dailyDecision.recommendation === 'recover' || dailyDecision.recommendation === 'reduce') {
    // Decyzja wynika z dzisiejszego stanu, więc pokazujemy jej faktyczny powód, a nie listę możliwych.
    action='deload';rationale=dailyDecision.reasons.length ? dailyDecision.reasons.join(' ') : 'Dzisiejszy stan przemawia za lżejszą najbliższą sesją.';
  } else if (plannedCount>0 && skipped.length/plannedCount>=0.5) {
    action='adjust';rationale='Co najmniej połowę wymagalnych sesji świadomie oznaczono jako pominięte. Przejrzyj dostępność i układ planu.';
  } else if (unrecorded.length) {
    rationale='Najpierw wyjaśnij brakujące zapisy wykonania. Nieodnotowane sesje nie dowodzą opuszczenia treningu.';
  }
  const nextWeekProposal: NextWeekProposal = {
    action,
    rationale,
    changesSummary,
  };

  const hasData = plannedCount > 0 || gymSessions.length > 0 || runs.length > 0;
  const assessmentStatus = hasData && !context.queryErrors.length ? "evaluated" : "insufficient_data";

  const summary = `Podsumowanie tygodnia ${weekStart}–${weekEnd}: ` +
    `ukończono ${adherence.completedSessionsCount ?? 'brak danych'}/${adherence.plannedSessionsCount ?? 'brak danych'} wymagalnych sesji, ` +
    `${adherence.cardioKm ?? 'brak danych'} km biegu, ${adherence.strengthSets ?? 'brak danych'} serii siłowych. ` +
    `Propozycja na kolejny tydzień: ${action}.`;

  return {
    weekStart,
    weekEnd,
    goalProgress,
    adherence,
    coverage: context.coverage,
    decisions,
    nextWeekProposal,
    assessmentStatus,
    summary,
  };
}
