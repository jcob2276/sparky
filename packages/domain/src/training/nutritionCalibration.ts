import { formatWarsawDate, shiftDateStr } from '../date.ts';
interface IntakeDay { date: string; calories: number | null }
interface WeightPoint { date: string; weight_kg: number | null }
interface DayReview { date: string; completeness: string }
export interface NutritionCalibration {
  status: 'ready' | 'collecting'; loggedDays: number; averageCalories: number | null;
  weeklyWeightChangeKg: number | null; maintenanceEstimateKcal: number | null; message: string;
  /** ±1σ błędu szacunku utrzymania (szum wagi + niedokładność logowania), kcal/dobę. */
  maintenanceUncertaintyKcal: number | null;
  confidence: 'low' | 'medium' | 'high' | null;
}
const KCAL_PER_KG = 7700;
/** Typowy dzienny szum wagi (woda, glikogen, jelita); dolna granica, by 2–3 punkty nie dawały fałszywej pewności. */
const MIN_WEIGHT_NOISE_KG = 0.4;
/** Systematyczny błąd logowania posiłków (sosy, oleje, porcje) jako ułamek średniego spożycia. */
const INTAKE_LOG_ERROR = 0.1;
/** Nachylenie regresji liniowej (kg/dobę) i jego błąd standardowy – wszystkie pomiary, nie tylko skrajne. */
export function weightSlope(points: WeightPoint[]): { perDay: number; se: number } | null {
  const n = points.length;
  if (n < 2) return null;
  const t0 = Date.parse(points[0].date);
  const xs = points.map(p => (Date.parse(p.date) - t0) / 86400000), ys = points.map(p => Number(p.weight_kg));
  const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  if (sxx === 0) return null;
  const perDay = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / sxx;
  const sse = xs.reduce((a, x, i) => a + (ys[i] - my - perDay * (x - mx)) ** 2, 0);
  const resid = n > 2 ? Math.sqrt(sse / (n - 2)) : 0;
  return { perDay, se: Math.max(resid, MIN_WEIGHT_NOISE_KG) / Math.sqrt(sxx) };
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
  const slope = ready ? weightSlope(points) : null;
  const change = slope ? slope.perDay*7 : null;
  const uncertainty = slope && averageCalories != null
    ? Math.round(Math.hypot(slope.se*KCAL_PER_KG, averageCalories*INTAKE_LOG_ERROR)) : null;
  return {status:ready?'ready':'collecting',loggedDays:days.length,averageCalories,
    weeklyWeightChangeKg:change == null ? null : Math.round(change*100)/100,
    maintenanceEstimateKcal:slope == null || averageCalories == null ? null : Math.round(averageCalories-slope.perDay*KCAL_PER_KG),
    maintenanceUncertaintyKcal:uncertainty,
    confidence:uncertainty == null ? null : uncertainty <= 200 ? 'high' : uncertainty <= 350 ? 'medium' : 'low',
    message:ready ? `Wspólne okno: ${first.date}–${last.date}, ${overlapping.length} pełnych dni. Trend masy i bilans energii są szacunkami.`
      : `Kalibracja potrzebuje co najmniej 14 pełnych dni w tym samym oknie co aktualne pomiary masy. Zapisano ${days.length} pełnych dni.`};
}
