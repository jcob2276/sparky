import { MEAL_TYPES, type MealTypeId } from '../../../lib/health/foodLogging';

const FOCUS_LABEL: Record<MealTypeId, string> = {
  breakfast: 'śniadanie',
  lunch: 'obiad',
  dinner: 'kolację',
  snack: 'przekąskę',
};

/** Uppercase slot tag for a planned meal key or composer meal type. */
export function mealSlotLabel(keyOrType: string): string {
  const value = keyOrType.toLowerCase();
  if (value.includes('break') || value.includes('śniad') || value.includes('sniad')) return 'Śniadanie';
  if (value.includes('lunch') || value.includes('obiad')) return 'Obiad';
  if (value.includes('dinner') || value.includes('kolac') || value.includes('supper')) return 'Kolacja';
  if (value.includes('snack') || value.includes('przek')) return 'Przekąska';
  return MEAL_TYPES.find(type => type.id === value)?.label ?? 'Posiłek';
}

export function mealFocusPrompt(type: MealTypeId): string {
  return FOCUS_LABEL[type];
}

function isMealTypeId(value: string): value is MealTypeId {
  return MEAL_TYPES.some(type => type.id === value);
}
