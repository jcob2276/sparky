import type { SeriesPoint } from './correlationEngine.ts'
import { getWarsawDateString } from './time.ts'

export function emptySeries(): Record<string, SeriesPoint[]> {
  return {
    strain: [], recovery: [], fueling: [], cardio: [], strength: [], cns_load: [], leg_load: [], mental_load: [],
    illness_score: [], hrv: [], rhr: [], readiness: [], sleep_h: [], sleep_score: [],
    sleep_efficiency: [], sleep_latency: [], deep_sleep_h: [], rem_sleep_h: [], light_sleep_h: [],
    sleep_hr: [], sleep_hrv: [], sleep_lowest_hr: [], restless_periods: [], temp_deviation: [],
    spo2: [], vo2max: [], stress_high_min: [], met_avg: [], sedentary_min: [], bedtime_hour: [],
    calories: [], protein: [], carbs: [], fat: [], sugar: [], fiber: [], insulin_load: [], food_quality: [],
    steps: [], caffeine_mg: [], caffeine_late_mg: [], last_coffee_hour: [], last_meal_hour: [], calories_late: [],
    dinner_hour: [], dinner_calories: [], dinner_carbs: [], dinner_fat: [], dinner_to_bed_gap_h: [],
    workout_hr_peak: [], workout_hr_avg: [], workout_strain: [],
    run_hr: [], run_rpe: [], run_cadence: [], run_suffer: [], run_distance_km: [],
    mood_score: [], daily_rpe: [], plan_done_pct: [], day_score: [], phone_drift: [],
    execution_score: [], identity_score: [], dopamine_load_index: [],
    screen_time_min: [], fragmentation_index: [], productivity_ratio: [], phone_active_h: [],
    friction_count: [], avoidance_count: [], procrastination_count: [],
    alcohol_units: [], travel_day: [], illness_day: [], stress_manual: [],
    creatine_taken: [], omega3_taken: [], lions_mane_taken: [], d3_taken: [],
    habit_count: [], weight_kg: [],
  }
}

export interface SeriesBuildInput {
  todayWarsaw: string
  strainRows: Record<string, unknown>[]
  ouraRows: Record<string, unknown>[]
  ouraEnhRows: Record<string, unknown>[]
  nutrRows: Record<string, unknown>[]
  aggregateRows: Record<string, unknown>[]
  frictionRows: { occurred_at: string | null; friction_type: string | null }[]
  foodRows: { date: string; name: string | null; logged_at: string | null; calories: number | null; carbs?: number | null; fat?: number | null; protein?: number | null; meal_type?: string | null }[]
  workoutRows: { workout_day: string | null; hr_avg_bpm: number | null; hr_peak_bpm: number | null; hr_strain_score: number | null }[]
  winsRows: Record<string, unknown>[]
  reconRows: { date: string; day_score: number | null; phone_drift_morning: boolean | null }[]
  behaviorRows: { date: string; behavior_key: string; value: number | null }[]
  supplementRows: { date: string; slug: string }[]
  stravaRows: { day: string; hr_avg: number | null; perceived_exertion: number | null; cadence_spm: number | null; suffer_score: number | null; distance: number | null }[]
  awRows: { date: string; productivity_ratio: number | null; phone_active_seconds: number | null }[]
  habitRows: Record<string, unknown>[]
  bodyRows: { date: string; weight: number | null }[]
}

export function aggregateStravaRuns(
  rows: Record<string, unknown>[],
  todayWarsaw: string,
  start90: string
): SeriesBuildInput['stravaRows'] {
  const byDay: Record<string, { hr: number[]; rpe: number[]; cadence: number[]; suffer: number[]; dist: number[] }> = {}
  for (const r of rows) {
    const start = r.start_date as string | null
    if (!start) continue
    const day = getWarsawDateString(new Date(start))
    if (day < start90 || day > todayWarsaw) continue
    if (r.is_oura === true) continue
    const sport = String(r.sport_type ?? '').toLowerCase()
    if (!sport.includes('run')) continue
    (byDay[day] ||= { hr: [], rpe: [], cadence: [], suffer: [], dist: [] })
    if (r.hr_avg != null) byDay[day].hr.push(Number(r.hr_avg))
    if (r.perceived_exertion != null) byDay[day].rpe.push(Number(r.perceived_exertion))
    if (r.cadence_spm != null) byDay[day].cadence.push(Number(r.cadence_spm))
    if (r.suffer_score != null) byDay[day].suffer.push(Number(r.suffer_score))
    if (r.distance != null) byDay[day].dist.push(Number(r.distance))
  }
  return Object.entries(byDay).map(([day, v]) => ({
    day,
    hr_avg: v.hr.length ? v.hr.reduce((a, b) => a + b, 0) / v.hr.length : null,
    perceived_exertion: v.rpe.length ? Math.max(...v.rpe) : null,
    cadence_spm: v.cadence.length ? v.cadence.reduce((a, b) => a + b, 0) / v.cadence.length : null,
    suffer_score: v.suffer.length ? Math.max(...v.suffer) : null,
    distance: v.dist.length ? v.dist.reduce((a, b) => a + b, 0) : null,
  }))
}
