import { studentTPValue } from '../stats.ts';
import { shiftDateStr } from '../date.ts';
import { ConfidenceTier, CorrelationMethod, ScatterPoint, CorrelationCore, SeriesPoint } from './types.ts';

export function pValue(r: number, n: number): number {
  if (n <= 2) return 1;
  const oneMinusR2 = 1 - r * r;
  if (oneMinusR2 <= 0) return 0;
  const t = r * Math.sqrt((n - 2) / oneMinusR2);
  return studentTPValue(t, n - 2);
}

export function rankValues(values: number[]): number[] {
  const indexed = values.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => a.v - b.v);
  const ranks = new Array(values.length);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j + 1 < indexed.length && indexed[j + 1].v === indexed[i].v) j++;
    const avgRank = (i + j + 2) / 2;
    for (let k = i; k <= j; k++) ranks[indexed[k].i] = avgRank;
    i = j + 1;
  }
  return ranks;
}

export function pearson(xy: [number, number][]): CorrelationCore | null {
  const n = xy.length;
  if (n < 3) return null;
  let sumX = 0, sumY = 0;
  for (const [x, y] of xy) { sumX += x; sumY += y; }
  const meanX = sumX / n, meanY = sumY / n;
  let sxx = 0, syy = 0, sxy = 0;
  for (const [x, y] of xy) {
    const dx = x - meanX, dy = y - meanY;
    sxx += dx * dx; syy += dy * dy; sxy += dx * dy;
  }
  if (sxx <= 0 || syy <= 0) return null;
  let r = sxy / (Math.sqrt(sxx) * Math.sqrt(syy));
  r = Math.max(-1, Math.min(1, r));
  return { r, n, p: pValue(r, n), slope: sxy / sxx, intercept: meanY - (sxy / sxx) * meanX };
}

export function spearman(xy: [number, number][]): CorrelationCore | null {
  if (xy.length < 3) return null;
  const xs = xy.map(p => p[0]);
  const ys = xy.map(p => p[1]);
  const rx = rankValues(xs);
  const ry = rankValues(ys);
  return pearson(rx.map((x, i) => [x, ry[i]]));
}

export function shiftDay(day: string, delta: number): string | null {
  if (delta === 0) return day;
  if (isNaN(new Date(day + 'T12:00:00Z').getTime())) return null;
  return shiftDateStr(day, delta);
}

export function laggedPairs(
  x: SeriesPoint[],
  y: SeriesPoint[],
  lagDays: number
): { pairs: [number, number][]; scatter: ScatterPoint[] } {
  const mapY: Record<string, number> = {};
  for (const row of y) mapY[row.day] = row.value;
  const pairs: [number, number][] = [];
  const scatter: ScatterPoint[] = [];
  for (const row of [...x].sort((a, b) => a.day.localeCompare(b.day))) {
    const shifted = shiftDay(row.day, lagDays);
    if (shifted && mapY[shifted] != null) {
      pairs.push([row.value, mapY[shifted]]);
      scatter.push({ day: row.day, x: row.value, y: mapY[shifted] });
    }
  }
  return { pairs, scatter };
}

export function dualCorrelation(pairs: [number, number][]): {
  pearson: CorrelationCore | null;
  spearman: CorrelationCore | null;
  method: CorrelationMethod;
  primary: CorrelationCore | null;
} {
  const pearsonR = pearson(pairs);
  const spearmanR = spearman(pairs);
  let method: CorrelationMethod = 'pearson';
  let primary = pearsonR;
  if (pearsonR && spearmanR) {
    if (Math.abs(spearmanR.r) > Math.abs(pearsonR.r) + 0.05) {
      method = 'spearman';
      primary = spearmanR;
    }
  } else if (!pearsonR && spearmanR) {
    method = 'spearman';
    primary = spearmanR;
  }
  return { pearson: pearsonR, spearman: spearmanR, method, primary };
}

export function interpretR(r: number): string {
  const a = Math.abs(r);
  const dir = r > 0 ? 'pozytywna' : 'negatywna';
  if (a >= 0.5) return `silna ${dir}`;
  if (a >= 0.3) return `umiarkowana ${dir}`;
  if (a >= 0.1) return `słaba ${dir}`;
  return 'brak korelacji';
}

export function confidenceTier(n: number): ConfidenceTier {
  if (n < 5) return 'calibrating';
  if (n < 12) return 'building';
  return 'solid';
}

// ── Czynniki Wpływu & Strict Statistical Gates ────────────────────────────────

export const ALLOWED_OUTCOMES = new Set([
  'sleep_h', 'sleep_score', 'sleep_efficiency', 'deep_sleep_h', 'rem_sleep_h',
  'sleep_hrv', 'hrv', 'sleep_lowest_hr', 'rhr', 'readiness', 'recovery',
  'plan_done_pct', 'execution_score', 'day_score', 'mood_score', 'weight_kg',
  'workout_strain', 'strain', 'cns_load',
  'screen_time_min', 'phone_drift', 'dopamine_load_index', 'friction_count', 'phone_sleep_min'
]);

export const ALLOWED_INPUTS = new Set([
  'caffeine_mg', 'caffeine_late_mg', 'last_coffee_hour', 'alcohol_units',
  'bedtime_hour', 'calories', 'calories_late', 'last_meal_hour', 'food_quality',
  'dinner_hour', 'dinner_calories', 'dinner_carbs', 'dinner_fat', 'dinner_to_bed_gap_h',
  'insulin_load', 'steps', 'workout_strain', 'strain', 'screen_time_min',
  'night_screen_min', 'planned_blocks_count', 'gym_tonnage_mg', 'sauna_min',
  'fragmentation_index', 'phone_drift', 'phone_active_h', 'creatine_taken',
  'omega3_taken', 'lions_mane_taken', 'd3_taken', 'habit_count',
  'weather_temp_mean', 'weather_sunshine_h', 'weather_precip_mm', 'weather_humidity',
  'phone_unlocks', 'phone_screen_min', 'screen_after_22_min', 'evening_lux', 'notif_per_hour',
  'home_wifi_min', 'work_wifi_min', 'headphones_min'
]);

export const REDUNDANT_GROUPS = [
  ['sleep_h', 'sleep_score', 'sleep_efficiency', 'deep_sleep_h', 'rem_sleep_h', 'light_sleep_h', 'sleep_latency', 'sleep_hr', 'sleep_hrv', 'sleep_lowest_hr', 'restless_periods', 'temp_deviation'],
  ['readiness', 'recovery'],
  ['calories', 'protein', 'carbs', 'fat', 'sugar', 'fiber', 'insulin_load'],
  ['steps', 'workout_strain', 'strain', 'cns_load', 'leg_load', 'cardio', 'strength', 'workout_hr_avg', 'workout_hr_peak'],
  ['screen_time_min', 'fragmentation_index', 'phone_active_h', 'dopamine_load_index', 'phone_screen_min', 'phone_unlocks', 'notif_per_hour'],
  ['screen_after_22_min', 'night_screen_min'],
  ['weather_temp_mean', 'weather_temp_max'],
  ['dinner_calories', 'dinner_carbs', 'dinner_fat']
];

export function isAllowedInput(metric: string): boolean {
  if (ALLOWED_INPUTS.has(metric)) return true;
  if (metric.startsWith('habit__') || metric.startsWith('behav__')) return true;
  return false;
}

export function areMetricsRedundant(x: string, y: string): boolean {
  if (x === y) return true;
  for (const group of REDUNDANT_GROUPS) {
    if (group.includes(x) && group.includes(y)) return true;
  }
  return false;
}

export function correlationCI(r: number, n: number) {
  if (n <= 3) return { lower: -1, upper: 1, crossesZero: true };
  const clippedR = Math.max(-0.9999, Math.min(0.9999, r));
  const z = 0.5 * Math.log((1 + clippedR) / (1 - clippedR));
  const se = 1 / Math.sqrt(n - 3);
  const zLower = z - 1.96 * se;
  const zUpper = z + 1.96 * se;
  const rLower = Math.tanh(zLower);
  const rUpper = Math.tanh(zUpper);
  return {
    lower: +rLower.toFixed(3),
    upper: +rUpper.toFixed(3),
    crossesZero: rLower * rUpper <= 0
  };
}

export function checkSplitHalfStability(scatter: ScatterPoint[]): boolean {
  if (scatter.length < 10) return false;
  const sorted = [...scatter].sort((a, b) => a.day.localeCompare(b.day));
  const mid = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, mid);
  const secondHalf = sorted.slice(mid);

  const r1 = pearson(firstHalf.map(p => [p.x, p.y]));
  const r2 = pearson(secondHalf.map(p => [p.x, p.y]));

  if (!r1 || !r2) return false;
  return Math.sign(r1.r) === Math.sign(r2.r) && Math.abs(r1.r) > 0.02 && Math.abs(r2.r) > 0.02;
}

export function fdrCorrection(pValues: number[], alpha = 0.10): boolean[] {
  const m = pValues.length;
  if (m === 0) return [];
  const indexed = pValues.map((p, originalIndex) => ({ p, originalIndex }));
  indexed.sort((a, b) => a.p - b.p);

  let maxK = -1;
  for (let k = 0; k < m; k++) {
    if (indexed[k].p <= ((k + 1) / m) * alpha) {
      maxK = k;
    }
  }

  const significant = new Array(m).fill(false);
  for (let k = 0; k <= maxK; k++) {
    significant[indexed[k].originalIndex] = true;
  }
  return significant;
}
