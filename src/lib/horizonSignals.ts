
export function needsNutritionCorrection(input: {
  loggedDays: number;
  averageProtein: number | null;
  proteinGoal: number;
  caloriesDeltaPct: number;
}): boolean {
  const proteinOnTrack = input.averageProtein !== null && input.averageProtein >= input.proteinGoal * 0.9;
  return input.loggedDays < 5 || !proteinOnTrack || input.caloriesDeltaPct > 8;
}

export function needsRecoveryCorrection(input: {
  warningDays: number;
  averageRecovery: number | null;
}): boolean {
  return input.warningDays >= 3 || (input.averageRecovery !== null && input.averageRecovery < 55);
}
