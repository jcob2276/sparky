import { fetchMealPhotoBlob } from './mealPhotoStore';
import { analyzeMealPhoto } from './mealPhotoScan';
import { parseFoodNL } from './foodLogging';

export interface Per100 {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface ReestimateResult {
  per100: Per100;
  /** True when the model looked at the meal photo, false when it only had the name. */
  viaPhoto: boolean;
}

interface Estimated {
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Macros per 100 g from the items the model returned (their own portions are only used as the divisor). */
export function per100FromItems(items: Estimated[]): Per100 | null {
  const totalGrams = items.reduce((sum, item) => sum + (item.grams || 0), 0);
  if (!items.length || totalGrams <= 0) return null;
  const per100 = (pick: (item: Estimated) => number) =>
    (items.reduce((sum, item) => sum + (pick(item) || 0), 0) * 100) / totalGrams;
  return {
    calories: per100((i) => i.calories),
    protein: per100((i) => i.protein),
    carbs: per100((i) => i.carbs),
    fat: per100((i) => i.fat),
  };
}

/** The photo shows the whole meal; this tells the model which single item the user means. */
export function buildPhotoHint(name: string, grams: number): string {
  return `${name}. Na zdjęciu jest cały posiłek, ale oceń TYLKO pozycję „${name}” (porcja użytkownika ok. ${grams} g) i zwróć dokładnie jedną pozycję.`;
}

/**
 * Re-asks the model for one corrected entry. With a stored meal photo it looks at the photo plus the corrected
 * name (so it can learn what the user really eats); without one, or if the photo analysis fails, name only.
 */
export async function reestimateEntry(input: {
  userId: string;
  name: string;
  grams: number;
  mealGroupId?: string | null;
}): Promise<ReestimateResult | null> {
  const { userId, name, grams, mealGroupId } = input;

  if (mealGroupId) {
    const image = await fetchMealPhotoBlob(userId, mealGroupId).catch(() => null);
    if (image) {
      try {
        const meal = await analyzeMealPhoto(image, userId, buildPhotoHint(name, grams));
        const per100 = per100FromItems(meal.items);
        if (per100) return { per100, viaPhoto: true };
      } catch (cause: unknown) {
        console.warn('[reestimateEntry] photo analysis failed, falling back to the name', cause);
      }
    }
  }

  const items = await parseFoodNL(`${name} ${grams} g`, userId, '');
  const per100 = per100FromItems(items);
  return per100 ? { per100, viaPhoto: false } : null;
}
