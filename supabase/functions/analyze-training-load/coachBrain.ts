import { avg, ACTIVITY_KW, PATTERN_RULES, LEG_PATTERN_KEYS, EXERCISE_LIBRARY, classifyFatigue, loadHint, dayDiff, exercisePatterns } from "../_shared/trainingHelpers.ts";
import { shiftDateStr } from '@vanguard/domain';

export function buildCoachBrain(opts: {
  workoutsAll: Array<{ date: string; exercise_logs?: Array<{
    exercise_name?: string; rir?: number | string | null; rpe?: number | string | null; muscle_tags?: string[];
  }> }>;
  stravaByWeek: Array<Array<{ sport_type?: string; hr_avg?: number | null }>>;
  w0: { recovAvg: number | null; strainAvg: number | null };
  baseStrain: number | null;
  today: string;
  todayDow: number;
  z2Ceiling: number | null;
  thresholdHr: number | null;
  allTimeE1rm: Record<string, number>;
  planContext?: Array<{ planned_date?: string | null; workout_type?: string; workout_name?: string;
    target_distance_km?: number | null; completed?: boolean | null; skipped_at?: string | null }>;
}) {
  const { workoutsAll, stravaByWeek, w0, baseStrain, today, z2Ceiling, thresholdHr, allTimeE1rm } = opts;

  // Pattern stats
  const patternStats: Record<string, {
    label: string; sets28: number; setsW0: number; lastDate: string | null;
    daysSince: number | null; avgRir: number | null; fatigue: 'low' | 'medium' | 'high';
  }> = Object.fromEntries(PATTERN_RULES.map(r => [r.key, {
    label: r.label, sets28: 0, setsW0: 0, lastDate: null, daysSince: null, avgRir: null, fatigue: 'low' as const,
  }]));
  const rirByPattern: Record<string, number[]> = Object.fromEntries(PATTERN_RULES.map(r => [r.key, []]));

  for (const w of workoutsAll) {
    const week = weekOf(w.date, today);
    for (const l of (w.exercise_logs || [])) {
      if (ACTIVITY_KW.test(l.exercise_name || '')) continue;
      const patterns = exercisePatterns(l.exercise_name || '', Array.isArray(l.muscle_tags) ? l.muscle_tags : []);
      const loggedRir = l.rir != null ? Number(l.rir) : null;
      const loggedRpe = l.rpe != null ? Number(l.rpe) : null;
      const rir = loggedRir != null && Number.isFinite(loggedRir) && loggedRir >= 0 && loggedRir <= 10
        ? loggedRir : loggedRpe != null && loggedRpe >= 1 && loggedRpe <= 10 ? 10 - loggedRpe : null;
      for (const p of patterns) {
        const s = patternStats[p];
        if (!s) continue;
        s.sets28++;
        if (week === 0) s.setsW0++;
        if (!s.lastDate || w.date > s.lastDate) s.lastDate = w.date;
        if (rir != null && Number.isFinite(rir)) rirByPattern[p].push(rir);
      }
    }
  }

  for (const [key, s] of Object.entries(patternStats)) {
    s.daysSince = dayDiff(s.lastDate, today);
    s.avgRir = avg(rirByPattern[key]) != null ? +(avg(rirByPattern[key])!).toFixed(1) : null;
    s.fatigue = classifyFatigue([key], s.avgRir, s.setsW0);
  }

  const pushSets = patternStats.push?.sets28 ?? 0;
  const pullSets = patternStats.pull?.sets28 ?? 0;
  const pushPullRatio = pullSets > 0 ? +(pushSets / pullSets).toFixed(2) : null;
  const strengthGapDays = workoutsAll.length ? dayDiff([...workoutsAll].sort((a, b) => b.date.localeCompare(a.date))[0].date, today) : null;
  const recentHardRuns = (stravaByWeek[0] ?? []).filter(r =>
    /run/i.test(r.sport_type || '') && thresholdHr != null && Number(r.hr_avg) > thresholdHr
  ).length;
  const threeDaysFromNow = shiftDateStr(today, 3);
  const hasUpcomingRunPlan = (opts.planContext ?? []).some(plan =>
    !plan.completed && !plan.skipped_at && plan.planned_date != null &&
    plan.planned_date >= today && plan.planned_date <= threeDaysFromNow &&
    ((plan.target_distance_km ?? 0) > 0 || /run|bieg|interwa|tempo|long|easy/i.test(`${plan.workout_type ?? ''} ${plan.workout_name ?? ''}`))
  );
  const highReadiness = w0.recovAvg != null && w0.recovAvg >= 75;
  const lowStrain = w0.strainAvg != null && w0.strainAvg < (baseStrain ?? 12) * 0.85;
  const strengthWindow = highReadiness && lowStrain && !hasUpcomingRunPlan && (strengthGapDays == null || strengthGapDays >= 4);

  const gapRules = [
    { key: 'calf', maxDays: 7, reason: 'łydka/Achilles musi amortyzować kilometraż biegowy' },
    { key: 'plyo', maxDays: 10, reason: 'moc reaktywna i ekonomia biegu' },
    { key: 'single_leg', maxDays: 10, reason: 'stabilizacja miednicy i kolana' },
    { key: 'tibialis', maxDays: 14, reason: 'stopa/piszczelowy jako ubezpieczenie' },
    { key: 'hinge', maxDays: 10, reason: 'posterior chain' },
    { key: 'core', maxDays: 10, reason: 'core/antyrotacja' },
    { key: 'pull', maxDays: 10, reason: 'plecy równoważą pressing' },
  ];
  const strengthGaps = gapRules
    .map(g => ({ ...g, daysSince: patternStats[g.key]?.daysSince, sets28: patternStats[g.key]?.sets28 ?? 0 }))
    .filter(g => g.daysSince == null || g.daysSince > g.maxDays || g.sets28 === 0)
    .sort((a, b) => (PATTERN_RULES.find(r => r.key === b.key)?.priority ?? 0) - (PATTERN_RULES.find(r => r.key === a.key)?.priority ?? 0));

  const coachDecisions: string[] = [];
  if (strengthWindow) coachDecisions.push('Okno na pełną sesję siłową: readiness wysokie, strain niski, przerwa od siłowni wystarczająca.');
  else if (w0.recovAvg != null && w0.recovAvg < 65) coachDecisions.push('Nie dokładaj ciężkich nóg: readiness niskie, lepiej upper/prehab/RIR 3-4.');
  if (strengthGaps.length) coachDecisions.push(`Priorytet siłowy: ${strengthGaps.slice(0, 3).map(g => patternStats[g.key]?.label).join(', ')}.`);
  if (pushPullRatio != null && pushPullRatio > 1.4) coachDecisions.push(`Push/pull ${pushPullRatio}: za dużo pressingu względem pleców, dołóż pull.`);
  if (recentHardRuns >= 2) coachDecisions.push(`Dwa mocne biegi w W0: nie dokładaj ego-liftingu nóg.`);
  if (hasUpcomingRunPlan) coachDecisions.push('W planie jest bieg w kolejnych 72h: ciężkie nogi tylko jeśli nie kolidują.');

  const orderedPatternKeys = [
    ...strengthGaps.map(g => g.key),
    ...(pushPullRatio != null && pushPullRatio > 1.4 ? ['pull'] : []),
    'hinge', 'calf', 'single_leg', 'pull', 'push', 'core', 'plyo',
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  const lowInterference = recentHardRuns >= 2 || hasUpcomingRunPlan || (w0.recovAvg != null && w0.recovAvg < 70);
  const sessionBlueprint = orderedPatternKeys
    .flatMap(key => {
      const choices = EXERCISE_LIBRARY[key] || [];
      const first = choices[0];
      if (!first) return [];
      const legPattern = LEG_PATTERN_KEYS.has(key);
      const adjustedSetsReps = lowInterference && legPattern
        ? first.setsReps.replace(/^4×/, '3×').replace(/^3×5$/, '2×5').replace(/^3×6-8$/, '2×6')
        : first.setsReps;
      return [{
        pattern: key, exercise: first.name, sets_reps: adjustedSetsReps,
        load: loadHint(first.name, lowInterference && legPattern ? null : first.intensity, allTimeE1rm, first.fallbackLoad),
        target_rir: lowInterference && legPattern ? 'RIR 3' : key === 'calf' ? 'RIR 1-2' : 'RIR 2',
        goal: first.goal,
        interference_cost: LEG_PATTERN_KEYS.has(key) ? (lowInterference ? 'medium' : 'high') : 'low',
      }];
    })
    .slice(0, 7);

  const hasCalf = sessionBlueprint.some(x => x.pattern === 'calf');
  const hasSingleLeg = sessionBlueprint.some(x => x.pattern === 'single_leg');
  const hasPull = sessionBlueprint.some(x => x.pattern === 'pull');
  const hasHeavyLeg = sessionBlueprint.some(x => x.interference_cost === 'high');
  const sessionReview = {
    coverage: { calf: hasCalf, single_leg: hasSingleLeg, pull: hasPull },
    interference_risk: hasHeavyLeg && (recentHardRuns >= 2 || hasUpcomingRunPlan) ? 'high' : hasHeavyLeg ? 'medium' : 'low',
    critique: [] as string[],
  };
  if (!hasCalf) sessionReview.critique.push('Propozycja nie obejmuje ćwiczeń łydki.');
  if (!hasSingleLeg) sessionReview.critique.push('Propozycja nie obejmuje ruchu jednonóż.');
  if (sessionReview.interference_risk === 'high') sessionReview.critique.push('Ciężkie nogi nakładają się z wymagającym bieganiem w oknie 72h.');

  return {
    role: 'Sparky_training_analysis',
    strength_gap_days: strengthGapDays, strength_window: strengthWindow,
    high_readiness: highReadiness, low_strain: lowStrain,
    recent_hard_runs: recentHardRuns, upcoming_run_plan_72h: hasUpcomingRunPlan,
    push_pull_ratio: pushPullRatio, pattern_stats: patternStats,
    priority_gaps: strengthGaps.slice(0, 6), deterministic_decisions: coachDecisions,
    session_blueprint: sessionBlueprint, session_review: sessionReview,
    session_bias: strengthWindow ? 'full_strength_with_posterior_chain_calf_single_leg'
      : recentHardRuns >= 2 || hasUpcomingRunPlan ? 'upper_prehab_calf_low_interference'
      : 'controlled_strength_rir_2_3',
  };
}

function weekOf(dateStr: string, today: string): number {
  const d = new Date(dateStr + 'T12:00:00Z');
  const t = new Date(today + 'T12:00:00Z');
  const diffDays = Math.floor((t.getTime() - d.getTime()) / 86400000);
  return Math.floor(diffDays / 7);
}
