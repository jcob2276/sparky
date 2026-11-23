/**
 * Plan tygodnia z posiłków, które użytkownik już zatwierdził (nutrition_meal_memories): bez AI i bez limitów.
 * Dla każdego dnia wybiera po jednym posiłku na porę dnia i skaluje porcje tak, by trafić w dzienne makra.
 */
export type MemorySlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MemoryItem {
  name: string;
  grams: number;
  /** Zatwierdzone wartości na 100 g. */
  per100: { kcal: number; protein: number; carbs: number; fat: number };
}

export interface MemoryMeal { id: string; name: string; slot: MemorySlot; confirmedCount: number; items: MemoryItem[] }
export interface DayTarget { kcal: number; protein: number; fat: number | null; carbs: number | null }

export interface PlannedItem { name: string; grams: number; kcal: number; protein: number; carbs: number; fat: number }
export interface PlannedMemoryMeal { memoryId: string; slot: MemorySlot; name: string; factor: number; items: PlannedItem[]; kcal: number; protein: number; carbs: number; fat: number }
export interface PlannedDay { meals: PlannedMemoryMeal[]; kcal: number; protein: number; carbs: number; fat: number }

const SLOTS: MemorySlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const SHARE: Record<MemorySlot, number> = { breakfast: 0.25, lunch: 0.35, dinner: 0.3, snack: 0.1 };
const FACTORS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const PER_SLOT = 10;

type Macros = { kcal: number; protein: number; carbs: number; fat: number };
const sum = (rows: Macros[]): Macros => ({
  kcal: rows.reduce((s, r) => s + r.kcal, 0), protein: rows.reduce((s, r) => s + r.protein, 0),
  carbs: rows.reduce((s, r) => s + r.carbs, 0), fat: rows.reduce((s, r) => s + r.fat, 0),
});

function scaled(meal: MemoryMeal, factor: number): PlannedMemoryMeal {
  const items = meal.items.map((item) => {
    const grams = Math.max(5, Math.round((item.grams * factor) / 5) * 5);
    const k = grams / 100;
    return { name: item.name, grams, kcal: Math.round(item.per100.kcal * k), protein: +(item.per100.protein * k).toFixed(1), carbs: +(item.per100.carbs * k).toFixed(1), fat: +(item.per100.fat * k).toFixed(1) };
  });
  const total = sum(items);
  return { memoryId: meal.id, slot: meal.slot, name: meal.name, factor, items, kcal: Math.round(total.kcal), protein: +total.protein.toFixed(1), carbs: +total.carbs.toFixed(1), fat: +total.fat.toFixed(1) };
}

/** Deterministyczny „losowy” składnik, żeby kolejne przelosowania dawały inne plany. */
function jitter(seed: number, key: string): number {
  let h = seed * 2654435761;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

function dayPenalty(total: Macros, target: DayTarget): number {
  const kcal = Math.abs(total.kcal - target.kcal) / target.kcal;
  const protein = Math.max(0, target.protein - total.protein) / target.protein;
  const fat = target.fat ? Math.max(0, total.fat - target.fat * 1.05) / target.fat : 0;
  const proteinOver = Math.max(0, total.protein - target.protein * 1.3) / target.protein;
  const carbs = target.carbs ? Math.abs(total.carbs - target.carbs) / target.carbs : 0;
  return kcal * 2 + protein * 3 + proteinOver + fat * 6 + carbs;
}

export function planWeekFromMemories(target: DayTarget, memories: readonly MemoryMeal[], days = 7, seed = 0): PlannedDay[] {
  if (target.kcal <= 0 || target.protein <= 0) return [];
  const usable = memories.filter((m) => m.items.length > 0 && m.items.every((i) => i.grams > 0 && Object.values(i.per100).every(Number.isFinite)));
  const used = new Map<string, number>();
  const plan: PlannedDay[] = [];
  for (let day = 0; day < days; day++) {
    const perSlot = SLOTS.map((slot) => {
      const slotTarget = { kcal: target.kcal * SHARE[slot], protein: target.protein * SHARE[slot] };
      const options = usable.filter((m) => m.slot === slot).map((meal) => {
        const best = FACTORS.map((f) => scaled(meal, f)).map((planned) => ({
          planned,
          penalty: Math.abs(planned.kcal - slotTarget.kcal) / slotTarget.kcal + Math.max(0, slotTarget.protein - planned.protein) / slotTarget.protein
            + (target.fat ? Math.max(0, planned.fat - target.fat * SHARE[slot] * 1.2) / (target.fat * SHARE[slot]) : 0),
        })).sort((a, b) => a.penalty - b.penalty)[0];
        const variety = 0.6 * (used.get(meal.id) ?? 0);
        const familiarity = -0.05 * Math.log1p(meal.confirmedCount);
        return { planned: best.planned, penalty: best.penalty + variety + familiarity + 0.2 * jitter(seed + day, meal.id) };
      }).sort((a, b) => a.penalty - b.penalty).slice(0, PER_SLOT);
      return options;
    }).filter((options) => options.length > 0);

    if (perSlot.length === 0) return [];
    let best: { meals: PlannedMemoryMeal[]; score: number } | null = null;
    const walk = (index: number, chosen: Array<{ planned: PlannedMemoryMeal; penalty: number }>) => {
      if (index === perSlot.length) {
        const total = sum(chosen.map((c) => c.planned));
        const score = dayPenalty(total, target) + chosen.reduce((s, c) => s + c.penalty, 0);
        if (!best || score < best.score) best = { meals: chosen.map((c) => c.planned), score };
        return;
      }
      for (const option of perSlot[index]) walk(index + 1, [...chosen, option]);
    };
    walk(0, []);
    if (!best) break;
    const meals = (best as { meals: PlannedMemoryMeal[] }).meals;
    meals.forEach((m) => used.set(m.memoryId, (used.get(m.memoryId) ?? 0) + 1));
    const total = sum(meals);
    plan.push({ meals, kcal: Math.round(total.kcal), protein: +total.protein.toFixed(1), carbs: +total.carbs.toFixed(1), fat: +total.fat.toFixed(1) });
  }
  return plan;
}
