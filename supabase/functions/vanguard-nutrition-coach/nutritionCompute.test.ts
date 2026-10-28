import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { computeNutritionSignals } from './nutritionCompute.ts';

Deno.test('computeNutritionSignals — standard stable inputs', () => {
  const data = {
    profile: {
      current_body_fat_est: 15,
      goal_body_fat: 12,
      weekly_loss_kg: 0.35,
      protein_g_per_kg: 2.0,
      birth_date: '1995-01-01',
      event_date: null,
    },
    bm: [
      { date: '2026-06-01', weight: 75.0, waist: 80, belly: 82 },
      { date: '2026-06-15', weight: 75.0, waist: 80, belly: 82 },
    ],
    oura: [
      { date: '2026-06-14', total_calories: 2500, active_calories: 400, steps: 8000, total_sleep_hours: 8, readiness_score: 80, hrv_avg: 50, rhr_avg: 55 },
      { date: '2026-06-15', total_calories: 2500, active_calories: 400, steps: 8000, total_sleep_hours: 8, readiness_score: 80, hrv_avg: 50, rhr_avg: 55 },
    ],
    nutr: [
      { date: '2026-06-14', calories: 2000, protein: 160, carbs: 200, fat: 70, fiber: 30 },
      { date: '2026-06-15', calories: 2000, protein: 160, carbs: 200, fat: 70, fiber: 30 },
    ],
    dayReviews: [
      { date: '2026-06-14', completeness: 'complete' },
      { date: '2026-06-15', completeness: 'complete' },
    ],
    runs: [],
    gym: [],
    todayOura: { date: '2026-06-15', total_calories: 2500, active_calories: 400, steps: 8000 },
    todayNutr: { date: '2026-06-15', calories: 1500, protein: 120, carbs: 150, fat: 50, fiber: 20 },
    medicalContext: { today: '2026-06-15', rule: '', latest_labs: [], body_composition: [], documents: [] },
    today: '2026-06-15',
    targetDate: new Date('2026-06-15T12:00:00Z'),
    d30: '2026-05-16',
  } satisfies Parameters<typeof computeNutritionSignals>[0];

  const { signals, estMaintenance, targetKcal, proteinFloor } = computeNutritionSignals(data);

  // weight trend is stable (weightChange = 0)
  assertEquals(signals.body.weight_trend_kg_per_week, 0);

  // protein floor: 75kg * 2.0 = 150g
  assertEquals(proteinFloor, 150);

  // Only two complete food days: cannot calibrate maintenance from that intake.
  assertEquals(estMaintenance, 2500);

  // targetKcal = estMaintenance - deficitPerDay - adaptiveCorrection + addBack
  // deficitPerDay = targetWeeklyLossKg * 7700 / 7 = 0.35 * 1100 = 385
  assertEquals(targetKcal, 2115);

  // remaining calculations
  assertEquals(signals.today.remaining_kcal, 2115 - 1500);
  assertEquals(signals.today.remaining_protein, 150 - 120); // 30
});

Deno.test('computeNutritionSignals — weight loss trend and goal estimation', () => {
  const data = {
    profile: {
      current_body_fat_est: 18,
      goal_body_fat: 14,
      weekly_loss_kg: 0.5,
      protein_g_per_kg: 2.0,
      birth_date: '1995-01-01',
      event_date: null,
    },
    bm: [
      { date: '2026-06-01', weight: 80.0 },
      { date: '2026-06-15', weight: 78.0 }, // lost 2kg in 14 days -> 1kg/week
    ],
    oura: [],
    nutr: [],
    dayReviews: [],
    runs: [],
    gym: [],
    todayOura: undefined,
    todayNutr: undefined,
    medicalContext: { today: '2026-06-15', rule: '', latest_labs: [], body_composition: [], documents: [] },
    today: '2026-06-15',
    targetDate: new Date('2026-06-15T12:00:00Z'),
    d30: '2026-05-16',
  } satisfies Parameters<typeof computeNutritionSignals>[0];

  const { signals, weightTrendPerWeek } = computeNutritionSignals(data);

  // 2kg lost in 14 days = 1kg / week loss -> trend = -1.0
  assertEquals(weightTrendPerWeek, -1.0);
  assertEquals(signals.forecast.observed_weekly_loss_kg, 1.0);

  // goal: 18% body fat to 14%.
  // 30d forecast weight: 78 + (-1/7)*30 = 78 - 4.28 = 73.7
  // Two weight points do not establish future lean/fat partition or a BF goal date.
  assertEquals(signals.forecast.days_to_goal_est, null);
});

Deno.test('missing weight, energy and incomplete food remain unknown rather than a fictional target', () => {
  const result = computeNutritionSignals({profile:{goal_body_fat:13},bm:[],oura:[],nutr:[{date:'2026-10-14',calories:800}],dayReviews:[],runs:[],gym:[],todayOura:undefined,todayNutr:undefined,
    medicalContext:{today:'2026-10-14',rule:'',latest_labs:[],body_composition:[],documents:[]},today:'2026-10-14',targetDate:new Date('2026-10-14T12:00:00Z'),d30:'2026-09-17'});
  assertEquals(result.targetKcal,null);
  assertEquals(result.proteinFloor,null);
  assertEquals(result.avgIntake,null);
  assertEquals(result.signals.recovery.avg_readiness,null);
  assertEquals(result.forecast90.weight,null);
  assertEquals(result.underlogGap,null);
});
