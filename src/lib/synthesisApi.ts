import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  buildSynthesis,
  calculateSynthesisConfidence,
  calculateTrajectory,
  detectConflicts,
  type DecisionCandidate,
  type SparkySynthesis,
  type SynthesisFactor,
} from '@vanguard/domain';
import { supabase } from './supabase';
import { getTodayWarsaw, shiftDateStr } from './date';
import { synthesisKeys } from './queryKeys';
import {
  projectLifeObligations,
  projectHealthspanLevers,
  projectMedicalSuggestions,
  projectOracleRecommendations,
  projectSystemProposals,
  projectTodoItems,
} from './synthesisProjection';
import {
  fetchMedicalEvents,
  fetchPreventionActions,
  savePreventionAction,
} from './health/medicalRecordsApi';
import { buildPreventionSuggestions } from './health/medicalRecords';
import { fetchHealthspanProfile } from './healthspanApi';

const numeric = (value: unknown) => typeof value === 'number' ? value : null;
const completionRatio = (row: Record<string, unknown>) => {
  const tasks = Array.isArray(row.daily_win_tasks)
    ? row.daily_win_tasks as Array<{ done?: boolean }>
    : [];
  if (tasks.length) return tasks.filter((task) => task.done).length / tasks.length * 100;
  const present = [1, 2, 3, 4, 5].filter((index) => row[`task_${index}`]);
  if (!present.length) return null;
  return present.filter((index) => row[`done_${index}`]).length / present.length * 100;
};

const ageFromBirthDate = (birthDate: string | null, today: string) => {
  if (!birthDate) return null;
  const birth = new Date(`${birthDate}T12:00:00Z`);
  const now = new Date(`${today}T12:00:00Z`);
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  if (
    now.getUTCMonth() < birth.getUTCMonth()
    || (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate())
  ) age--;
  return age;
};

async function fetchSynthesis(userId: string, today = getTodayWarsaw()): Promise<SparkySynthesis> {
  const since = shiftDateStr(today, -13);
  const until = shiftDateStr(today, 30);
  const [
    strainRes, nutritionRes, winsRes, calendarRes, todoRes, obligationsRes,
    proposalsRes, recommendationsRes, trainingRes, profileRes, medicalEvents, medicalActions,
    healthspan,
  ] = await Promise.all([
    supabase.from('daily_strain').select('date, recovery_score, strain_score, daily_status, main_limiter, updated_at')
      .eq('user_id', userId).gte('date', since).lte('date', today).order('date'),
    supabase.from('daily_nutrition').select('date, protein, calories, created_at')
      .eq('user_id', userId).gte('date', since).lte('date', today).order('date'),
    supabase.from('daily_wins').select('date, task_1, task_2, task_3, task_4, task_5, done_1, done_2, done_3, done_4, done_5, daily_win_tasks(done)')
      .eq('user_id', userId).gte('date', since).lte('date', today).order('date'),
    supabase.from('vanguard_calendar').select('id, summary, start_time, end_time')
      .eq('user_id', userId).gte('start_time', `${today}T00:00:00`).lte('start_time', `${until}T23:59:59`).order('start_time'),
    supabase.from('todo_items').select('id, title, priority, due_date, deadline_date, duration_minutes, status, updated_at')
      .eq('user_id', userId).neq('status', 'completed').order('updated_at', { ascending: false }).limit(80),
    supabase.from('life_obligations').select('id, title, anchor_date, kind, updated_at')
      .eq('user_id', userId).eq('is_active', true).lte('anchor_date', until),
    supabase.from('system_proposals').select('id, title, body, proposal_type, status, created_at')
      .eq('user_id', userId).eq('status', 'pending'),
    supabase.from('oracle_recommendations').select('id, recommendation_text, related_metric, status, created_at, evaluation_window_days, outcome, decision_status, baseline_value, actual_value, evaluated_at')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
    supabase.from('training_plan_workouts').select('id, workout_name, workout_type, planned_date, target_duration_min, completed, created_at')
      .eq('user_id', userId).eq('planned_date', today),
    supabase.from('nutrition_profile').select('birth_date').eq('user_id', userId).maybeSingle(),
    fetchMedicalEvents(userId).catch(() => []),
    fetchPreventionActions(userId).catch(() => []),
    fetchHealthspanProfile(userId, today).catch(() => null),
  ]);

  const suggestions = buildPreventionSuggestions({
    events: medicalEvents,
    today,
    age: ageFromBirthDate(profileRes.data?.birth_date ?? null, today),
  });
  const candidates = [
    ...projectTodoItems(todoRes.data ?? [], today),
    ...projectLifeObligations(obligationsRes.data ?? [], today),
    ...projectSystemProposals(proposalsRes.data ?? []),
    ...projectOracleRecommendations(recommendationsRes.data ?? []),
    ...projectMedicalSuggestions(suggestions, medicalActions),
    ...projectHealthspanLevers(healthspan?.levers ?? []),
    ...(trainingRes.data ?? []).filter((row) => !row.completed).map((row): DecisionCandidate => ({
      id: `training:${row.id}`,
      source: 'training',
      sourceId: row.id,
      domain: 'training',
      title: row.workout_name,
      detail: row.workout_type,
      impact: 78,
      urgency: 85,
      confidence: 95,
      effort: Math.min(100, Math.round((row.target_duration_min ?? 45) / 1.2)),
      freshness: 90,
      dueDate: row.planned_date,
      status: 'candidate',
      conflictsWith: [],
    })),
  ];

  const strainRows = strainRes.data ?? [];
  const nutritionRows = nutritionRes.data ?? [];
  const winRows = (winsRes.data ?? []) as Array<Record<string, unknown>>;
  const calendarMinutes = (calendarRes.data ?? []).reduce((sum, row) => {
    if (!row.start_time) return sum;
    const start = new Date(row.start_time).getTime();
    const end = row.end_time ? new Date(row.end_time).getTime() : start;
    return sum + Math.max(0, (end - start) / 60_000);
  }, 0);
  const recoveryTrajectory = calculateTrajectory(strainRows.map((row) => numeric(row.recovery_score)));
  const trajectories = {
    recovery: recoveryTrajectory,
    training: calculateTrajectory(strainRows.map((row) => numeric(row.strain_score))),
    nutrition: calculateTrajectory(nutritionRows.map((row) => numeric(row.protein))),
    execution: calculateTrajectory(winRows.map(completionRatio)),
    medical: suggestions.length ? 'declining' as const : 'stable' as const,
    calendar: calendarMinutes > 8 * 60 ? 'volatile' as const : 'stable' as const,
  };

  const latestStrain = strainRows[strainRows.length - 1];
  const factors: SynthesisFactor[] = [];
  if (latestStrain?.recovery_score != null && latestStrain.recovery_score < 60) {
    factors.push({
      id: 'low-recovery', domain: 'recovery', title: 'Ograniczona regeneracja',
      direction: 'negative', impact: 90, urgency: 85, confidence: 95, effort: 25,
      freshness: 100, evidence: `Recovery ${Math.round(latestStrain.recovery_score)}/100`,
    });
  }
  if (calendarMinutes > 8 * 60) {
    factors.push({
      id: 'calendar-load', domain: 'calendar', title: 'Przeciążony kalendarz',
      direction: 'negative', impact: 85, urgency: 90, confidence: 100, effort: 35,
      freshness: 100, evidence: `${Math.round(calendarMinutes / 60)} h zaplanowanego czasu`,
    });
  }
  if (trajectories.execution === 'improving') {
    factors.push({
      id: 'execution-momentum', domain: 'execution', title: 'Rosnąca konsekwencja wykonania',
      direction: 'positive', impact: 78, urgency: 45, confidence: 80, effort: 20,
      freshness: 90, evidence: 'Trend wykonania PowerList rośnie.',
    });
  }
  if (suggestions.length) {
    factors.push({
      id: 'medical-open', domain: 'medical', title: `${suggestions.length} otwarte sprawy zdrowotne`,
      direction: 'negative', impact: 70, urgency: 55, confidence: 75, effort: 20,
      freshness: 90, evidence: suggestions.map((item) => item.title).join(', '),
    });
  }

  const plannedMinutes = candidates.reduce((sum, item) => sum + item.effort * 1.2, 0);
  const conflicts = detectConflicts({
    recoveryTrajectory,
    trainingIntensityPlanned: (trainingRes.data ?? []).some((row) => /interval|tempo|vo2|threshold/i.test(`${row.workout_type} ${row.workout_name}`)),
    availableMinutes: Math.max(60, 16 * 60 - calendarMinutes),
    plannedEffortMinutes: plannedMinutes,
    completedSourceIds: new Set<string>(),
    candidates,
  });
  const available = [
    strainRows.length, nutritionRows.length, winRows.length, calendarRes.data?.length,
    todoRes.data?.length, obligationsRes.data?.length, recommendationsRes.data?.length,
    medicalEvents.length,
  ].filter(Boolean).length;
  const confidence = calculateSynthesisConfidence({
    expectedSources: 8,
    availableSources: available,
    freshnessScores: [100, 90, 90, 100, 90].slice(0, Math.max(1, available)),
    evidenceScores: factors.map((factor) => factor.confidence),
  });
  const recommendationOutcomes = (recommendationsRes.data ?? [])
    .filter((row) => row.status === 'evaluated' && row.outcome)
    .slice(0, 5)
    .map((row) => ({
      id: `recommendation:${row.id}`,
      title: row.recommendation_text,
      outcome: row.outcome as 'success' | 'fail' | 'inconclusive' | 'no_data',
      explanation: row.outcome === 'no_data'
        ? 'Brak wystarczających danych do uczciwej oceny.'
        : `Wartość bazowa ${row.baseline_value ?? '—'} → wynik ${row.actual_value ?? '—'}.`,
      evaluatedAt: row.evaluated_at,
    }));
  return buildSynthesis({
    date: today,
    trajectories,
    factors,
    candidates,
    conflicts,
    confidence,
    recommendationOutcomes,
  });
}

export function useSynthesisQuery(userId: string | undefined) {
  const today = getTodayWarsaw();
  return useQuery({
    queryKey: synthesisKeys.today(userId ?? '', today),
    queryFn: () => fetchSynthesis(userId!, today),
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
  });
}

export function useSynthesisDecisionMutation(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { candidate: DecisionCandidate; decision: 'accept' | 'dismiss' | 'complete' | 'snooze' }) => {
      if (!userId) throw new Error('Brak użytkownika');
      const { candidate, decision } = input;
      if (candidate.source === 'todo' && decision === 'complete') {
        const { error } = await supabase.from('todo_items').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', candidate.sourceId).eq('user_id', userId);
        if (error) throw error;
      } else if (candidate.source === 'system_proposal') {
        const status = decision === 'dismiss' ? 'dismissed' : 'confirmed';
        const { error } = await supabase.from('system_proposals').update({ status, resolved_at: new Date().toISOString() }).eq('id', candidate.sourceId).eq('user_id', userId);
        if (error) throw error;
      } else if (candidate.source === 'oracle_recommendation') {
        const decisionStatus = decision === 'dismiss' ? 'rejected' : 'accepted';
        const { error } = await supabase.from('oracle_recommendations').update({ decision_status: decisionStatus, decision_at: new Date().toISOString() }).eq('id', candidate.sourceId).eq('user_id', userId);
        if (error) throw error;
      } else if (candidate.source === 'medical_prevention') {
        await savePreventionAction({
          userId,
          suggestionKey: candidate.sourceId,
          status: decision === 'complete' ? 'done' : decision === 'snooze' ? 'snoozed' : 'dismissed',
          sourceUrl: '',
          snoozedUntil: decision === 'snooze' ? shiftDateStr(getTodayWarsaw(), 14) : null,
        });
      } else if (candidate.source === 'healthspan') {
        const status = decision === 'dismiss' ? 'dismissed'
          : decision === 'complete' ? 'completed'
            : 'accepted';
        const { error } = await supabase.from('healthspan_levers').update({
          status,
          decided_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', candidate.sourceId).eq('user_id', userId);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: synthesisKeys.all }),
  });
}
