interface PhotoParsedFoodItem {
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  confidence: 'high' | 'medium' | 'low';
  source: 'llm' | 'database' | 'library';
  assumptions?: string[];
  parseMeta?: {
    macroSource: 'library' | 'generic' | 'reference_pl' | 'off' | 'llm_estimate' | 'user_correction';
    parserVersion: string;
    quantity?: number;
    unit?: string;
    explicitGrams?: boolean;
    validationStatus?: 'accepted' | 'review';
  };
}

interface MealPhotoQuestion {
  id: string;
  itemId: string;
  prompt: string;
  impactKcal: number;
  options: Array<{
    id: string; label: string; grams?: number; calories?: number;
    protein?: number; carbs?: number; fat?: number; fiber?: number; sugar?: number;
  }>;
}

interface MealPhotoDraftItem extends PhotoParsedFoodItem {
  id: string;
  portionRange: { minGrams: number; maxGrams: number };
  questionCandidates: MealPhotoQuestion[];
}

export interface MealPhotoDraft {
  items: MealPhotoDraftItem[];
  questions: MealPhotoQuestion[];
  estimate: { calories: number; minKcal: number; maxKcal: number };
  parserVersion: 'meal-photo-v1';
}

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function finite(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function positive(value: unknown, fallback: number): number {
  return Math.max(1, finite(value, fallback));
}

function confidence(value: unknown): PhotoParsedFoodItem['confidence'] {
  return value === 'high' || value === 'low' ? value : 'medium';
}

function normalizeOptions(value: unknown): MealPhotoQuestion['options'] {
  const options = (Array.isArray(value) ? value : []).slice(0, 6).flatMap((entry, index) => {
    const option = record(entry);
    const label = typeof option.label === 'string' ? option.label.trim() : '';
    if (!label) return [];
    return [{
      id: typeof option.id === 'string' && option.id.trim() ? option.id.trim() : `option-${index + 1}`,
      label: label.slice(0, 80),
      grams: option.grams == null ? undefined : Math.round(positive(option.grams, 1)),
      calories: option.calories == null ? undefined : Math.max(0, Math.round(finite(option.calories))),
      protein: option.protein == null ? undefined : Math.max(0, Math.round(finite(option.protein) * 10) / 10),
      carbs: option.carbs == null ? undefined : Math.max(0, Math.round(finite(option.carbs) * 10) / 10),
      fat: option.fat == null ? undefined : Math.max(0, Math.round(finite(option.fat) * 10) / 10),
      fiber: option.fiber == null ? undefined : Math.max(0, Math.round(finite(option.fiber) * 10) / 10),
      sugar: option.sugar == null ? undefined : Math.max(0, Math.round(finite(option.sugar) * 10) / 10),
    }];
  }).filter((option) => option.id !== 'unknown');

  return [...options, { id: 'unknown', label: 'Nie wiem' }];
}

function normalizeQuestions(value: unknown, itemId: string): MealPhotoQuestion[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry, index) => {
    const question = record(entry);
    const prompt = typeof question.prompt === 'string' ? question.prompt.trim() : '';
    const impactKcal = Math.max(0, Math.round(finite(question.impactKcal)));
    if (!prompt || impactKcal === 0) return [];
    return [{
      id: typeof question.id === 'string' && question.id.trim()
        ? question.id.trim().slice(0, 100)
        : `${itemId}-question-${index + 1}`,
      itemId,
      prompt: prompt.slice(0, 180),
      impactKcal,
      options: normalizeOptions(question.options),
    }];
  });
}

export function normalizeMealPhotoResponse(raw: unknown): MealPhotoDraft {
  const root = record(raw);
  if (!Array.isArray(root.items) || root.items.length === 0) {
    throw new Error('meal photo contains no food items');
  }

  const items = root.items.slice(0, 12).map((entry, index): MealPhotoDraftItem => {
    const item = record(entry);
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    if (!name) throw new Error(`meal photo item ${index + 1} has no name`);
    const grams = Math.round(positive(item.grams, 100));
    const minGrams = Math.min(grams, Math.round(positive(item.minGrams, grams * 0.75)));
    const maxGrams = Math.max(grams, Math.round(positive(item.maxGrams, grams * 1.25)));
    const id = typeof item.id === 'string' && item.id.trim()
      ? item.id.trim().slice(0, 100)
      : `photo-item-${index + 1}`;
    const questions = normalizeQuestions(item.questions, id);
    const assumptions = Array.isArray(item.assumptions)
      ? item.assumptions.filter((value): value is string => typeof value === 'string').slice(0, 6)
      : [];
    return {
      id,
      name: name.slice(0, 160),
      grams,
      calories: Math.max(0, Math.round(finite(item.calories))),
      protein: Math.max(0, Math.round(finite(item.protein) * 10) / 10),
      carbs: Math.max(0, Math.round(finite(item.carbs) * 10) / 10),
      fat: Math.max(0, Math.round(finite(item.fat) * 10) / 10),
      fiber: item.fiber == null ? undefined : Math.max(0, Math.round(finite(item.fiber) * 10) / 10),
      sugar: item.sugar == null ? undefined : Math.max(0, Math.round(finite(item.sugar) * 10) / 10),
      confidence: confidence(item.confidence),
      source: 'llm',
      assumptions: ['porcja oszacowana ze zdjęcia', ...assumptions],
      parseMeta: {
        macroSource: 'llm_estimate',
        parserVersion: 'meal-photo-v1',
        quantity: grams,
        unit: 'g',
        explicitGrams: false,
        validationStatus: 'review',
      },
      portionRange: { minGrams, maxGrams },
      questionCandidates: questions,
    };
  });

  const questions = items
    .flatMap((item) => item.questionCandidates)
    .sort((a, b) => b.impactKcal - a.impactKcal || a.id.localeCompare(b.id))
    .slice(0, 3);
  const calories = items.reduce((sum, item) => sum + item.calories, 0);
  const minKcal = items.reduce(
    (sum, item) => sum + item.calories * item.portionRange.minGrams / item.grams,
    0,
  );
  const maxKcal = items.reduce(
    (sum, item) => sum + item.calories * item.portionRange.maxGrams / item.grams,
    0,
  );

  return {
    items,
    questions,
    estimate: {
      calories: Math.round(calories),
      minKcal: Math.max(0, Math.round(minKcal)),
      maxKcal: Math.max(Math.round(calories), Math.round(maxKcal)),
    },
    parserVersion: 'meal-photo-v1',
  };
}
