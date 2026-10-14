import { shiftDateStr } from '../date';
import { fetchNutritionDashboardData } from './nutritionDashboardApi';
import { auditNutritionDay } from './nutritionAudit';
import { calibrateNutrition } from './nutritionCalibration';

export async function loadNutritionDashboard(userId:string,today:string) {
  const {targetRes,nutritionRes,entriesRes,calibrationRes,weightsRes,dayReviews} = await fetchNutritionDashboardData({userId,today,since:shiftDateStr(today,-6),calibrationSince:shiftDateStr(today,-27)});
  const target = targetRes.data, todayEntries = entriesRes.data ?? [];
  const verdict = target?.verdict;
  const details = verdict && typeof verdict === 'object' && !Array.isArray(verdict) ? verdict : {};
  const suggestions = details.food_suggestions;
  return {proteinGoal:target?.protein_floor_g ?? null,kcalTarget:target?.target_kcal ?? null,
    weeklyBudget:target?.target_kcal == null ? null : target.target_kcal*7,
    rows:nutritionRes.data ?? [],todayEntries,
    forecast:target,aiSuggestions:Array.isArray(suggestions) ? suggestions.filter((item):item is string=>typeof item === 'string').slice(0,3) : [],
    forecastNote:typeof details.forecast_note === 'string' ? details.forecast_note : null,
    dayAudit:auditNutritionDay(todayEntries),completeDates:dayReviews.filter(row=>row.completeness === 'complete').map(row=>row.date),
    calibration:calibrateNutrition(calibrationRes.data ?? [],(weightsRes.data ?? []).flatMap(row=>typeof row.date === 'string' ? [{date:row.date,weight_kg:row.weight}] : []),dayReviews,today),
  };
}
