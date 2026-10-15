export type NetEnergyGoal = 'deficit' | 'maintenance' | 'surplus';

export interface NetEnergyInput {
  weightKg?: number | null;
  heightCm?: number | null;
  age?: number | null;
  sex?: 'male' | 'female' | null;
  /** Active calories burned from workouts and daily movement */
  activeCaloriesBurned: number;
  /** Total calories consumed from food logging */
  caloriesConsumed: number;
  /** Target goal: deficit, maintenance, or surplus (default: maintenance) */
  targetGoal?: NetEnergyGoal;
  /** Explicit BMR override if already calculated by wearable */
  bmrOverride?: number | null;
}

export interface NetEnergyResult {
  bmr: number;
  activeBurn: number;
  tef: number;
  tdee: number;
  consumed: number;
  netKcal: number;
  status: 'deficit' | 'balanced' | 'surplus';
  statusLabel: string;
  targetGoal: NetEnergyGoal;
  isGoalAligned: boolean;
  projectedWeeklyKgDelta: number;
  recommendation: string;
}

/**
 * Calculates Mifflin-St Jeor Basal Metabolic Rate (BMR)
 */
export function estimateBMR(
  weightKg?: number | null,
  heightCm?: number | null,
  age?: number | null,
  sex?: 'male' | 'female' | null
): number {
  const w = weightKg && weightKg > 30 && weightKg < 250 ? weightKg : 75;
  const h = heightCm && heightCm > 100 && heightCm < 240 ? heightCm : 178;
  const a = age && age > 14 && age < 110 ? age : 30;
  const s = sex === 'female' ? -161 : 5;

  // Mifflin-St Jeor equation: 10 * weight (kg) + 6.25 * height (cm) - 5 * age + s
  return Math.round(10 * w + 6.25 * h - 5 * a + s);
}

/**
 * Calculates Net Energy Balance (Bevel Net Energy engine)
 */
export function calculateNetEnergy(input?: NetEnergyInput | null): NetEnergyResult {
  const safeInput = input || { activeCaloriesBurned: 0, caloriesConsumed: 0 };
  const bmr = safeInput.bmrOverride && safeInput.bmrOverride > 800
    ? Math.round(safeInput.bmrOverride)
    : estimateBMR(safeInput.weightKg, safeInput.heightCm, safeInput.age, safeInput.sex);

  const activeBurn = Math.max(0, Math.round(Number(safeInput.activeCaloriesBurned) || 0));
  const consumed = Math.max(0, Math.round(Number(safeInput.caloriesConsumed) || 0));
  
  // Thermic Effect of Food (TEF) is ~10% of ingested calories
  const tef = Math.round(consumed * 0.1);

  // Total Daily Energy Expenditure
  const tdee = bmr + activeBurn + tef;

  // Net Balance = Consumed - TDEE
  const netKcal = consumed - tdee;

  const targetGoal = safeInput.targetGoal || 'maintenance';

  let status: 'deficit' | 'balanced' | 'surplus' = 'balanced';
  let statusLabel = 'Równowaga energetyczna';
  let recommendation = 'Podaż kalorii pokrywa bieżący wydatek energetyczny organizmu.';

  if (netKcal < -150) {
    status = 'deficit';
    statusLabel = `Deficyt energetyczny (${netKcal} kcal)`;
    recommendation = targetGoal === 'deficit'
      ? 'Optymalny deficyt sprzyjający redukcji tkanki tłuszczowej przy zachowaniu masy beztłuszczowej.'
      : 'Ujemny bilans kaloryczny. Jeśli celem jest regeneracja lub budowa siły, rozważ dodatkową porcję węglowodanów złożonych.';
  } else if (netKcal > 150) {
    status = 'surplus';
    statusLabel = `Nadwyżka energetyczna (+${netKcal} kcal)`;
    recommendation = targetGoal === 'surplus'
      ? 'Kontrolowana nadwyżka kaloryczna wspierająca anabolizm i adaptację do ciężkich jednostek siłowych.'
      : 'Dodatni bilans kaloryczny przewyższa bieżące zapotrzebowanie ruchowe.';
  }

  const isGoalAligned =
    (targetGoal === 'deficit' && netKcal < -150) ||
    (targetGoal === 'surplus' && netKcal > 150) ||
    (targetGoal === 'maintenance' && Math.abs(netKcal) <= 150);

  // ~7700 kcal corresponds to approximately 1kg body fat change
  const projectedWeeklyKgDelta = parseFloat(((netKcal * 7) / 7700).toFixed(2));

  return {
    bmr,
    activeBurn,
    tef,
    tdee,
    consumed,
    netKcal,
    status,
    statusLabel,
    targetGoal,
    isGoalAligned,
    projectedWeeklyKgDelta,
    recommendation,
  };
}
