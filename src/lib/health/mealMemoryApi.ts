import { supabase } from '../supabase';
import type { MemoryMeal, MemorySlot } from '@vanguard/domain';

const SLOTS = new Set<string>(['breakfast', 'lunch', 'dinner', 'snack']);
const finite = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);

interface RawItem { name?: unknown; grams?: unknown; per100?: { calories?: unknown; protein?: unknown; carbs?: unknown; fat?: unknown } | null }

/** Zamienia zapisany posiłek na format planera; pomija te, w których brakuje gramatury lub makr. */
export function toMemoryMeal(row: { id: string; name: string | null; meal_type: string; confirmed_count: number | null; items: unknown }): MemoryMeal | null {
  if (!SLOTS.has(row.meal_type) || !Array.isArray(row.items) || row.items.length === 0) return null;
  const items = (row.items as RawItem[]).flatMap((raw) => {
    const grams = finite(raw.grams), kcal = finite(raw.per100?.calories), protein = finite(raw.per100?.protein);
    const carbs = finite(raw.per100?.carbs), fat = finite(raw.per100?.fat);
    if (typeof raw.name !== 'string' || grams == null || grams <= 0 || kcal == null || protein == null || carbs == null || fat == null) return [];
    return [{ name: raw.name, grams, per100: { kcal, protein, carbs, fat } }];
  });
  if (items.length !== row.items.length) return null;
  // „Kopia z 2026-10-25” to skopiowany dzień; czytelniejsza jest nazwa złożona ze składników.
  const name = !row.name || /^Kopia z /i.test(row.name) ? items.slice(0, 3).map((i) => i.name).join(', ') : row.name;
  return { id: row.id, name, slot: row.meal_type as MemorySlot, confirmedCount: row.confirmed_count ?? 0, items };
}

/** Posiłki, które użytkownik już zatwierdził (wartości na 100 g są jego, nie z modelu). */
export async function fetchMealMemories(userId: string): Promise<MemoryMeal[]> {
  const { data, error } = await supabase.from('nutrition_meal_memories')
    .select('id,name,meal_type,confirmed_count,items').eq('user_id', userId)
    .order('confirmed_count', { ascending: false }).limit(400);
  if (error) throw error;
  return (data ?? []).flatMap((row) => { const meal = toMemoryMeal(row); return meal ? [meal] : []; });
}
