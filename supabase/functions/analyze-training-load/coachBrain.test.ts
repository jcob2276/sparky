import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { buildCoachBrain } from './coachBrain.ts';

const input = {
  workoutsAll: [{ date: '2026-10-08', exercise_logs: [{ exercise_name: 'Przysiad', rpe: 8, rir: null }] }],
  stravaByWeek: [[], [], [], []], w0: { recovAvg: 80, strainAvg: 4 },
  baseStrain: 10, today: '2026-10-14', todayDow: 3,
  z2Ceiling: 150, thresholdHr: 175, allTimeE1rm: {},
};

Deno.test('upcoming incomplete run changes the strength session rather than ignoring the plan', () => {
  const result = buildCoachBrain({ ...input, planContext: [{
    planned_date: '2026-10-15', workout_name: 'Bieg spokojny', target_distance_km: 5, completed: false,
  }] });
  assertEquals(result.upcoming_run_plan_72h, true);
  assertEquals(result.session_blueprint.some(s => s.interference_cost === 'high'), false);
});

Deno.test('completed and distant runs do not restrict the next strength session', () => {
  const result = buildCoachBrain({ ...input, planContext: [
    { planned_date: '2026-10-15', workout_name: 'Bieg', completed: true },
    { planned_date: '2026-10-19', workout_name: 'Bieg', completed: false },
  ] });
  assertEquals(result.upcoming_run_plan_72h, false);
});

Deno.test('set RPE eight means approximately two reps in reserve rather than eight', () => {
  assertEquals(buildCoachBrain(input).pattern_stats.squat.avgRir, 2);
});

Deno.test('a planned run prevents a full strength window from overriding interference', () => {
  const result = buildCoachBrain({ ...input, planContext: [{
    planned_date: '2026-10-14', workout_name: 'Interwały biegowe', completed: false,
  }] });
  assertEquals(result.strength_window, false);
});
