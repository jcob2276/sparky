import { avg } from "./ragHelpers.ts";

function formatHealthSummary(
  summary: Record<string, unknown>,
  foodByDate: Record<string, unknown[]>,
  rawDayLimit: number,
) {
  return `[ZDROWIE/JEDZENIE — AGREGAT 14D + OSTATNIE ${rawDayLimit}D]:
${JSON.stringify({ ...summary, food_products: foodByDate })}`;
}

export function computeHealthSummary(
  oura14d: Array<Record<string, unknown>>,
  nutrition14d: Array<Record<string, unknown>>,
  foodEntries14d: Array<Record<string, unknown>>,
  fourteenDaysAgoDate: string,
  todayDate: string,
  wantsFullBiometrics: boolean,
) {
  const rawDayLimit = wantsFullBiometrics ? 14 : 5;
  const ouraRaw = oura14d.slice(0, rawDayLimit);
  const nutritionRaw = nutrition14d.slice(0, rawDayLimit);
  const foodByDate: Record<string, unknown[]> = {};
  const rawDates = new Set(
    ouraRaw.map((d) => String(d.date)).concat(nutritionRaw.map((d) => String(d.date)))
  );
  for (const e of foodEntries14d) {
    const dateStr = String(e.date);
    if (!wantsFullBiometrics && !rawDates.has(dateStr)) continue;
    if (!foodByDate[dateStr]) foodByDate[dateStr] = [];
    foodByDate[dateStr].push({
      meal: e.meal_type,
      name: e.name,
      kcal: e.calories,
      B: e.protein,
      W: e.carbs,
      T: e.fat,
      Bl: e.fiber ?? undefined,
      Cuk: e.sugar ?? undefined,
      q: e.food_quality_score ?? undefined,
    });
  }

  const healthSummary14d = {
    date_from: fourteenDaysAgoDate,
    date_to: todayDate,
    oura_days_logged: oura14d.length,
    nutrition_days_logged: nutrition14d.length,
    avg_steps: avg(oura14d, "steps"),
    avg_active_calories: avg(oura14d, "active_calories"),
    avg_total_calories_burned: avg(oura14d, "total_calories"),
    avg_food_calories: avg(nutrition14d, "calories"),
    avg_protein: avg(nutrition14d, "protein"),
    avg_carbs: avg(nutrition14d, "carbs"),
    avg_fat: avg(nutrition14d, "fat"),
    avg_fiber: avg(nutrition14d, "fiber"),
    avg_sugar: avg(nutrition14d, "sugar"),
    avg_sleep_hours: avg(oura14d, "total_sleep_hours"),
    avg_hrv: avg(oura14d, "hrv_avg"),
    avg_readiness: avg(oura14d, "readiness_score"),
    oura_daily: ouraRaw,
    nutrition_daily: nutritionRaw,
  };

  const healthSummaryText = formatHealthSummary(healthSummary14d, foodByDate, rawDayLimit);
  return { healthSummary14d, healthSummaryText };
}

export function formatStrainContext(
  rows: Array<Record<string, unknown>>,
  wantsFullBiometrics: boolean,
) {
  if (!rows.length) return '[DAILY STRAIN]: brak danych (jeszcze nie policzono).';
  const visible = wantsFullBiometrics ? rows : rows.slice(0, 5);
  const today = rows[0];
  return `[DAILY STRAIN — DANE DETERMINISTYCZNE]:
DZIŚ: Strain ${today?.strain_score ?? '—'}/21, Recovery ${today?.recovery_score ?? '—'}/100, Fueling ${today?.fueling_score ?? '—'}/100, Status ${today?.daily_status ?? '—'}, Limiter: ${today?.main_limiter ?? '—'}.
Green=można obciążać, yellow=ostrożnie, red=regeneracja. Fueling provisional nie jest finalnym wynikiem.
Historia: ${JSON.stringify(visible)}`;
}
