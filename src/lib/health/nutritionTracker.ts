import type { ParsedFoodItem } from './foodLogging';

export type NutritionDayCompleteness = 'complete' | 'partial' | 'unknown';

export interface GuidedQuestionOption {
  id: string;
  label: string;
  grams?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
}

export interface GuidedQuestion {
  id: string;
  prompt: string;
  impactKcal: number;
  options: GuidedQuestionOption[];
  itemId?: string;
}

export interface MealDraftItem extends ParsedFoodItem {
  id: string;
  questionCandidates?: GuidedQuestion[];
}

const scaleMacro = (value: number | undefined, scale: number) => value == null
  ? undefined
  : Math.round(value * scale * 10) / 10;

export function applyGuidedAnswer<T extends MealDraftItem>(
  items: T[],
  question: GuidedQuestion,
  option: GuidedQuestionOption,
): T[] {
  if (option.id === 'unknown' || !question.itemId) return items;
  return items.map((item) => {
    if (item.id !== question.itemId) return item;
    const hasGrams = option.grams != null && option.grams > 0;
    const hasCalories = option.calories != null && option.calories >= 0;
    const hasExactMacros = [option.protein, option.carbs, option.fat, option.fiber, option.sugar]
      .some((value) => value != null && value >= 0);
    if (!hasGrams && !hasCalories && !hasExactMacros) return item;

    const grams = hasGrams ? Math.max(1, Math.round(option.grams!)) : item.grams;
    const portionScale = grams / Math.max(1, item.grams);
    const macroScale = hasCalories
      ? option.calories! / Math.max(1, item.calories)
      : portionScale;
    const exactOrScaled = (exact: number | undefined, current: number | undefined) => exact != null
      ? Math.round(Math.max(0, exact) * 10) / 10
      : scaleMacro(current, macroScale);

    return {
      ...item,
      grams,
      calories: hasCalories ? Math.round(option.calories!) : Math.round(item.calories * portionScale),
      protein: exactOrScaled(option.protein, item.protein) ?? 0,
      carbs: exactOrScaled(option.carbs, item.carbs) ?? 0,
      fat: exactOrScaled(option.fat, item.fat) ?? 0,
      fiber: exactOrScaled(option.fiber, item.fiber),
      sugar: exactOrScaled(option.sugar, item.sugar),
    } as T;
  });
}

export function selectGuidedQuestions(
  items: MealDraftItem[],
  limit = 3,
): GuidedQuestion[] {
  const byId = new Map<string, GuidedQuestion>();
  for (const item of items) {
    for (const question of item.questionCandidates ?? []) {
      const candidate = { ...question, itemId: question.itemId ?? item.id };
      const current = byId.get(candidate.id);
      if (!current || candidate.impactKcal > current.impactKcal) {
        byId.set(candidate.id, candidate);
      }
    }
  }
  return [...byId.values()]
    .filter((question) => Number.isFinite(question.impactKcal) && question.impactKcal > 0)
    .sort((a, b) => b.impactKcal - a.impactKcal || a.id.localeCompare(b.id))
    .slice(0, Math.min(3, Math.max(0, limit)));
}

function normalizeFingerprintPart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/gi, (letter) => (letter === 'Ł' ? 'L' : 'l'))
    .toLocaleLowerCase('pl')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildMealFingerprint(items: MealDraftItem[]): string {
  return [...new Set(items.map((item) => normalizeFingerprintPart(item.name)).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'pl'))
    .join('|');
}

export function isCalibrationEligible(
  status: NutritionDayCompleteness | null | undefined,
): boolean {
  return status === 'complete';
}

export function mealMemoryCalories(value: unknown): number | null {
  if (!Array.isArray(value)) return null;
  const calories = value.reduce((sum, raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return sum;
    const item = raw as Record<string, unknown>;
    const per100 = item.per100 && typeof item.per100 === 'object' && !Array.isArray(item.per100)
      ? item.per100 as Record<string, unknown>
      : {};
    const grams = Number(item.grams);
    const kcal = Number(per100.calories);
    return Number.isFinite(grams) && grams > 0 && Number.isFinite(kcal) && kcal >= 0
      ? sum + grams * kcal / 100
      : sum;
  }, 0);
  return calories > 0 ? Math.round(calories) : null;
}

export function mealMemoryToDraft(value: unknown): MealDraftItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw, index) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
    const item = raw as Record<string, unknown>;
    const per100 = item.per100 && typeof item.per100 === 'object' && !Array.isArray(item.per100)
      ? item.per100 as Record<string, unknown>
      : {};
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const grams = Math.max(1, Math.round(Number(item.grams)));
    const calories = Number(per100.calories);
    const protein = Number(per100.protein);
    const carbs = Number(per100.carbs);
    const fat = Number(per100.fat);
    if (!name || ![grams, calories, protein, carbs, fat].every(Number.isFinite)) return [];
    const scale = grams / 100;
    return [{
      id: `memory-${index + 1}`,
      name,
      grams,
      calories: Math.round(calories * scale),
      protein: Math.round(protein * scale * 10) / 10,
      carbs: Math.round(carbs * scale * 10) / 10,
      fat: Math.round(fat * scale * 10) / 10,
      fiber: per100.fiber == null ? undefined : Math.round(Number(per100.fiber) * scale * 10) / 10,
      sugar: per100.sugar == null ? undefined : Math.round(Number(per100.sugar) * scale * 10) / 10,
      confidence: 'high' as const,
      source: 'library' as const,
    }];
  });
}

export interface MealMemoryRecord {
  id: string;
  name: string | null;
  meal_type: string;
  items: unknown;
  confirmed_count: number;
}

export interface MealMemorySuggestion {
  id: string;
  name: string;
  mealType: string;
  items: unknown;
  confirmedCount: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  score: number;
  reason: string;
}

export function rankMealMemoriesForGap(
  memories: MealMemoryRecord[],
  target: { remainingCalories: number; remainingProtein: number; mealType?: string },
): MealMemorySuggestion[] {
  if (target.remainingCalories <= 0) return [];
  return memories.flatMap((memory): MealMemorySuggestion[] => {
    const items = mealMemoryToDraft(memory.items);
    if (!items.length) return [];
    const calories = Math.round(items.reduce((sum, item) => sum + item.calories, 0));
    const protein = Math.round(items.reduce((sum, item) => sum + item.protein, 0) * 10) / 10;
    const carbs = Math.round(items.reduce((sum, item) => sum + item.carbs, 0) * 10) / 10;
    const fat = Math.round(items.reduce((sum, item) => sum + item.fat, 0) * 10) / 10;
    const calorieDelta = Math.abs(calories - target.remainingCalories);
    const calorieFit = Math.max(0, 1 - calorieDelta / Math.max(400, target.remainingCalories));
    const overPenalty = calories > target.remainingCalories
      ? Math.min(0.35, (calories - target.remainingCalories) / Math.max(400, target.remainingCalories))
      : 0;
    const proteinCoverage = target.remainingProtein > 0
      ? Math.min(1, protein / target.remainingProtein)
      : 0.5;
    const familiarity = Math.min(1, Math.log2(Math.max(1, memory.confirmed_count) + 1) / 4);
    const mealTypeBonus = target.mealType && memory.meal_type === target.mealType ? 0.08 : 0;
    const score = calorieFit * 0.55 + proteinCoverage * 0.25 + familiarity * 0.12 + mealTypeBonus - overPenalty;
    const reason = proteinCoverage >= 0.8 && calorieFit >= 0.65
      ? 'dobrze domyka kalorie i białko'
      : calorieFit >= 0.8
        ? 'najlepiej pasuje do pozostałych kalorii'
        : proteinCoverage >= 0.8
          ? 'mocno domyka brakujące białko'
          : 'najbliżej dzisiejszego celu';
    return [{
      id: memory.id,
      name: memory.name?.trim() || items.map((item) => item.name).join(' + '),
      mealType: memory.meal_type,
      items: memory.items,
      confirmedCount: memory.confirmed_count,
      calories,
      protein,
      carbs,
      fat,
      score: Math.round(score * 1000) / 1000,
      reason,
    }];
  }).sort((a, b) => b.score - a.score || b.confirmedCount - a.confirmedCount || a.name.localeCompare(b.name, 'pl'));
}

export function buildNutritionProjection(
  current: number,
  target: number,
  nextMeal: number | null,
) {
  const projected = Math.round(current + (nextMeal ?? 0));
  return {
    current: Math.round(current),
    nextMeal: nextMeal == null ? null : Math.round(nextMeal),
    projected,
    remainingAfter: Math.round(target - projected),
  };
}
