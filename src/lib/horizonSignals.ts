
export function needsNutritionCorrection(input: {
  loggedDays: number;
  averageProtein: number | null;
  proteinGoal: number | null;
  caloriesDeltaPct: number | null;
}): boolean {
  const proteinBelow = input.averageProtein != null && input.proteinGoal != null && input.averageProtein < input.proteinGoal * 0.9;
  return input.loggedDays < 5 || proteinBelow || (input.caloriesDeltaPct != null && input.caloriesDeltaPct > 8);
}

export function needsRecoveryCorrection(input: {
  warningDays: number;
  averageRecovery: number | null;
}): boolean {
  return input.warningDays >= 3 || (input.averageRecovery !== null && input.averageRecovery < 55);
}
