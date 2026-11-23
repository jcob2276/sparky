import { supabase } from '../supabase';

export interface EntrySnapshot {
  amount: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

export interface FeedbackSource extends EntrySnapshot {
  name: string;
  meal_group_id: string | null;
  parse_meta: unknown;
}

const num = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
const meta = (parse_meta: unknown): Record<string, unknown> => (parse_meta && typeof parse_meta === 'object' ? parse_meta as Record<string, unknown> : {});

/** Tylko wpisy z oszacowania AI (zdjęcie, szacunek modelu) mają sens jako dane o błędzie szacunku. */
export function isEstimatedEntry(parseMeta: unknown): boolean {
  const m = meta(parseMeta);
  return m.macroSource === 'llm_estimate' || m.input_mode === 'photo';
}

/** Czy poprawka realnie zmienia wartości (kcal ≥ 1, makra ≥ 0,5 g albo porcja). */
export function entryChanged(before: EntrySnapshot, after: EntrySnapshot): boolean {
  return before.amount !== after.amount
    || Math.abs(num(before.calories) - num(after.calories)) >= 1
    || (['protein', 'carbs', 'fat'] as const).some((k) => Math.abs(num(before[k]) - num(after[k])) >= 0.5);
}

const snapshot = (s: EntrySnapshot) => ({ amount: s.amount, calories: num(s.calories), protein: num(s.protein), carbs: num(s.carbs), fat: num(s.fat) });

/**
 * Zapisuje, jak użytkownik poprawił szacunek. Pierwszy zapis zachowuje oryginalny szacunek;
 * kolejne poprawki aktualizują tylko wartość końcową. Błąd zapisu nigdy nie blokuje edycji wpisu.
 */
export async function recordEstimateFeedback(userId: string, entryId: string, before: FeedbackSource, after: EntrySnapshot): Promise<void> {
  if (!isEstimatedEntry(before.parse_meta) || !entryChanged(before, after)) return;
  try {
    const { data: existing } = await supabase.from('nutrition_estimate_feedback')
      .select('id').eq('user_id', userId).eq('entry_id', entryId).maybeSingle();
    const now = new Date().toISOString();
    if (existing) {
      await supabase.from('nutrition_estimate_feedback').update({ final: snapshot(after), updated_at: now }).eq('id', existing.id);
      return;
    }
    const m = meta(before.parse_meta);
    await supabase.from('nutrition_estimate_feedback').insert({
      user_id: userId,
      entry_id: entryId,
      meal_group_id: before.meal_group_id,
      name: before.name,
      input_mode: typeof m.input_mode === 'string' ? m.input_mode : null,
      macro_source: typeof m.macroSource === 'string' ? m.macroSource : null,
      estimated: snapshot(before),
      final: snapshot(after),
    });
  } catch (error) {
    console.debug('[estimateFeedback]', error);
  }
}
