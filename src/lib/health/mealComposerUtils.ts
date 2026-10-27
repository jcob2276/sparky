import type { MealDraftItem } from './nutritionTracker';
import type { ParsedFoodItem } from './foodLogging';
import type { FoodBase } from './foodTypes';
import { assessEnergyConsistency, describeEnergyMismatch } from '@vanguard/domain';
import { isMacroSource, type MacroSource } from './foodTrust';

function scalePer100(value: number | null, grams: number): number {
  if (value == null) return 0;
  return Math.round((value * grams) / 100 * 10) / 10;
}

export function parsedToDraft(items: ParsedFoodItem[]): MealDraftItem[] {
  return items.map((item, index) => ({
    ...item,
    id: `draft-${index + 1}-${crypto.randomUUID().slice(0, 8)}`,
  }));
}

export function foodBaseToDraft(food: FoodBase, grams: number): MealDraftItem {
  const g = Math.max(1, Math.round(grams));
  const defaultGrams = food.defaultGrams != null && food.defaultGrams > 0
    ? Math.round(food.defaultGrams)
    : undefined;
  const energy = assessEnergyConsistency(food);
  const energyWarning = energy.status === 'mismatch' ? describeEnergyMismatch(energy, food.calories ?? 0) : undefined;
  return {
    id: crypto.randomUUID(),
    name: food.name,
    grams: g,
    calories: Math.round(scalePer100(food.calories, g)),
    protein: scalePer100(food.protein, g),
    carbs: scalePer100(food.carbs, g),
    fat: scalePer100(food.fat, g),
    fiber: food.fiber == null ? undefined : scalePer100(food.fiber, g),
    sugar: food.sugar == null ? undefined : scalePer100(food.sugar, g),
    saturatedFat: food.saturated_fat == null ? undefined : scalePer100(food.saturated_fat, g),
    confidence: energyWarning ? 'low' : food.confidence ?? 'high',
    source: food.source === 'confirmed' ? 'library' : 'database',
    assumptions: energyWarning ? [`niespójna energia: ${energyWarning}`] : undefined,
    parseMeta: {
      ...(energyWarning ? { warnings: [energyWarning], validationStatus: 'review' as const } : {}),
      macroSource: food.source === 'confirmed' ? 'user_correction' : 'off',
      parserVersion: 'composer-search-v1',
      explicitGrams: true,
      unit: 'g',
      quantity: g,
      defaultGrams,
    },
  };
}

export interface RepeatableFoodEntry {
  id: string;
  name: string;
  brand: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar: number | null;
  saturated_fat?: number | null;
  salt?: number | null;
  amount: string | null;
  parse_meta?: unknown;
}

interface PriorProvenance {
  macroSource?: MacroSource;
  explicitGrams?: boolean;
  uncertaintyPct?: number;
}

function readPriorProvenance(meta: unknown): PriorProvenance {
  if (!meta || typeof meta !== 'object') return {};
  const record = meta as Record<string, unknown>;
  return {
    macroSource: isMacroSource(record.macroSource) ? record.macroSource : undefined,
    explicitGrams: typeof record.explicitGrams === 'boolean' ? record.explicitGrams : undefined,
    uncertaintyPct: typeof record.uncertainty_pct === 'number' && Number.isFinite(record.uncertainty_pct)
      ? record.uncertainty_pct : undefined,
  };
}

/** Kopia dziedziczy pewność oryginału: wysoka tylko dla danych, które nie były szacunkiem. */
function confidenceFromUncertainty(pct: number | undefined): MealDraftItem['confidence'] {
  if (pct == null || pct <= 12) return 'high';
  return pct <= 22 ? 'medium' : 'low';
}

export function parseAmountGrams(amount: string | null): number {
  if (!amount) return 100;
  const match = amount.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return 100;
  return Math.max(1, Math.round(parseFloat(match[1].replace(',', '.'))));
}

export function entriesToDraft(entries: RepeatableFoodEntry[]): MealDraftItem[] {
  return entries.map((entry, index) => {
    const grams = parseAmountGrams(entry.amount);
    const prior = readPriorProvenance(entry.parse_meta);
    return {
      id: `repeat-${index + 1}`,
      name: entry.name,
      grams,
      calories: entry.calories ?? 0,
      protein: entry.protein ?? 0,
      carbs: entry.carbs ?? 0,
      fat: entry.fat ?? 0,
      fiber: entry.fiber ?? undefined,
      sugar: entry.sugar ?? undefined,
      saturatedFat: entry.saturated_fat ?? undefined,
      salt: entry.salt ?? undefined,
      confidence: confidenceFromUncertainty(prior.uncertaintyPct),
      source: 'library' as const,
      parseMeta: prior.macroSource ? {
        macroSource: prior.macroSource,
        parserVersion: 'repeat-v2',
        explicitGrams: prior.explicitGrams,
        priorUncertaintyPct: prior.uncertaintyPct,
      } : undefined,
    };
  });
}

export function mealLabelForType(mealType: string): string {
  if (mealType === 'breakfast') return 'śniadanie';
  if (mealType === 'lunch') return 'obiad';
  if (mealType === 'dinner') return 'kolację';
  return 'przekąskę';
}
