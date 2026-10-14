import { formatWarsawDate, shiftDateStr } from '../date.ts';
interface IntakeDay { date: string; calories: number | null }
interface WeightPoint { date: string; weight_kg: number | null }
interface DayReview { date: string; completeness: string }
export interface NutritionCalibration {
  status: 'ready' | 'collecting'; loggedDays: number; averageCalories: number | null;
  weeklyWeightChangeKg: number | null; maintenanceEstimateKcal: number | null; message: string;
}
/** Calibration requires overlapping, recent evidence. It remains an energy-balance estimate. */
export function calibrateNutrition(intake: IntakeDay[], weights: WeightPoint[], reviews: DayReview[] = [], today = formatWarsawDate(new Date())): NutritionCalibration {
  const completeDates = new Set(reviews.filter(row => row.completeness === 'complete').map(row => row.date));
  const days = [...new Map(intake.filter(row => row.date <= today && row.date >= shiftDateStr(today,-41)
    && row.calories != null && Number.isFinite(row.calories) && row.calories >= 0 && completeDates.has(row.date)).map(row => [row.date,row])).values()];
  const points = [...new Map(weights.filter(row => row.date <= today && row.date >= shiftDateStr(today,-41)
    && row.weight_kg != null && Number.isFinite(row.weight_kg) && row.weight_kg > 0).map(row => [row.date,row])).values()].sort((a,b)=>a.date.localeCompare(b.date));
  const first = points[0], last = points.at(-1);
  const span = first && last ? (Date.parse(last.date)-Date.parse(first.date))/86400000 : 0;
  const overlapping = first && last ? days.filter(row => row.date >= first.date && row.date <= last.date) : [];
  const ready = span >= 13 && last != null && last.date >= shiftDateStr(today,-7) && overlapping.length >= 14 && overlapping.length / (span+1) >= 0.8;
  const evidence = ready ? overlapping : days;
  const averageCalories = evidence.length ? Math.round(evidence.reduce((sum,row)=>sum+Number(row.calories),0)/evidence.length) : null;
  const change = ready ? (Number(last.weight_kg)-Number(first.weight_kg))*7/span : null;
  return {status:ready?'ready':'collecting',loggedDays:days.length,averageCalories,
    weeklyWeightChangeKg:change == null ? null : Math.round(change*100)/100,
    maintenanceEstimateKcal:change == null || averageCalories == null ? null : Math.round(averageCalories-change*7700/7),
    message:ready ? `Wspólne okno: ${first.date}–${last.date}, ${overlapping.length} pełnych dni. Trend masy i bilans energii są szacunkami.`
      : `Kalibracja potrzebuje co najmniej 14 pełnych dni w tym samym oknie co aktualne pomiary masy. Zapisano ${days.length} pełnych dni.`};
}
