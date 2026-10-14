import {
  type HealthCoachContext,
  type HealthCoachWeeklyReview,
  type GoalProgressReview,
  type WeeklyAdherence,
  type WeeklyDecisionReview,
  type NextWeekProposal,
  type CoachRow,
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
    return d >= weekStart && d <= weekEnd;
  });

  const completed = plannedRows.filter((r: CoachRow) => Boolean(r.completed));
  const skipped = plannedRows.filter((r: CoachRow) => !r.completed && Boolean(r.skipped_at));
  const unrecorded = plannedRows.filter((r: CoachRow) => !r.completed && !r.skipped_at);

  // 2. Activity totals within the week
  const runs = (context.sources.strava_activities_clean.value ?? []).filter((row: CoachRow) => {
    const d = String(row.start_date ?? row.date ?? "").slice(0, 10);
    return d >= weekStart && d <= weekEnd;
  });
  const totalMeters = runs.reduce((sum: number, r: CoachRow) => sum + (Number(r.distance) || 0), 0);
  const cardioKm = Math.round((totalMeters / 1000) * 10) / 10;

  const gymSessions = (context.sources.workout_sessions.value ?? []).filter((row: CoachRow) => {
    const d = String(row.session_date ?? row.date ?? "").slice(0, 10);
    return d >= weekStart && d <= weekEnd;
  });
  const strengthSets = gymSessions.reduce((sum: number, r: CoachRow) => sum + (Number(r.total_sets) || 0), 0);

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
    note: unrecorded.length > 0
      ? `${unrecorded.length} zaplanowanych sesji nie ma zapisanego wykonania w loggerze ani zgłoszenia pominięcia.`
      : "Wszystkie zaplanowane sesje posiadają status wykonania lub pominięcia.",
  };

  // 3. Goal KPIs progress evaluation
  const kpiRows = context.sources.goal_kpis.value ?? [];
  const goalProgress: GoalProgressReview[] = kpiRows.map((row: CoachRow) => {
    const kpiId = String(row.id ?? "");
    const name = String(row.label ?? row.name ?? "Cel");
    const target = Number(row.target ?? 0);
    const unit = String(row.unit ?? "");
    const standard = String(row.measurement_standard ?? "standard domyślny");
    const val = row.current_value != null && Number.isFinite(Number(row.current_value))
      ? Number(row.current_value)
      : null;

    if (val == null) {
      return {
        kpiId,
        name,
        target,
        currentValue: null,
        unit,
        standard,
        status: "unassessed",
        evidenceRefs: [],
        note: "Brak aktualnego pomiaru dla tego wskaźnika w oknie tygodnia.",
      };
    }

    const isTimeOrLowerBetter = unit === "s" || unit === "min" || unit.includes("pace");
    const isProgressing = isTimeOrLowerBetter ? val <= target * 1.1 : val >= target * 0.9;

    return {
      kpiId,
      name,
      target,
      currentValue: val,
      unit,
      standard,
      status: isProgressing ? "progressing" : "stable",
      evidenceRefs: [
        {
          table: "goal_kpis",
          id: kpiId,
          observedAt: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
          kind: "measured",
        },
      ],
      note: `Aktualny wynik: ${val} ${unit} (cel: ${target} ${unit}, standard: ${standard}).`,
    };
  });

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
  let rationale = "Plan tygodnia zrealizowany stabilnie bez konieczności gwałtownych zmian.";
  const changesSummary: string[] = [];

  if (plannedCount > 0 && adherenceRate != null && adherenceRate < 0.5) {
    action = "adjust";
    rationale = "Wykonano poniżej 50% założeń — dostosowanie rozkładu dni do realnej dostępności czasowej.";
    changesSummary.push("Zmniejszenie zagęszczenia sesji lub reorganizacja dni treningowych.");
  } else if (plannedCount > 0 && adherenceRate != null && adherenceRate >= 0.8) {
    action = "progress";
    rationale = "Wysoka realizacja założeń — planowana progresja obciążenia w kluczowych bojach i odcinkach.";
    changesSummary.push("Zwiększenie intensywności lub objętości serii głównych o ~2.5–5%.");
  } else {
    action = "keep";
    changesSummary.push("Utrzymanie bieżącego układu jednostek i obciążeń.");
  }

  const nextWeekProposal: NextWeekProposal = {
    action,
    rationale,
    changesSummary,
  };

  const hasData = plannedCount > 0 || gymSessions.length > 0 || runs.length > 0;
  const assessmentStatus = hasData ? "evaluated" : "insufficient_data";

  const summary = `Podsumowanie tygodnia ${weekStart}–${weekEnd}: ` +
    `ukończono ${completed.length}/${plannedCount} zaplanowanych sesji, ` +
    `${cardioKm} km biegu, ${strengthSets} serii siłowych. ` +
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
