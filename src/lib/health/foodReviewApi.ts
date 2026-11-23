import { supabase } from '../supabase';

export interface ReviewCandidate {
  libraryId: string;
  name: string;
  brand: string | null;
  source: string | null;
  useCount: number;
  defaultGrams: number | null;
  /** Wartości na 100 g. */
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

/** Najczęściej używane produkty, których makr jeszcze nikt nie sprawdził. */
export async function fetchReviewCandidates(userId: string, limit = 30): Promise<ReviewCandidate[]> {
  const { data, error } = await supabase.from('food_favorites')
    .select('library_id,use_count,default_grams,food_library!inner(name,brand,source,calories,protein,carbs,fat,validation_status)')
    .eq('user_id', userId).eq('food_library.user_id', userId).eq('food_library.validation_status', 'unreviewed')
    .order('use_count', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []).flatMap((row) => row.library_id ? [{
    libraryId: row.library_id,
    name: row.food_library.name,
    brand: row.food_library.brand,
    source: row.food_library.source,
    useCount: row.use_count ?? 0,
    defaultGrams: row.default_grams,
    calories: row.food_library.calories,
    protein: row.food_library.protein,
    carbs: row.food_library.carbs,
    fat: row.food_library.fat,
  }] : []);
}

/** `verified` = makra zatwierdzone; `quarantined` = produkt znika z podpowiedzi i wyszukiwania. */
export async function setLibraryValidation(userId: string, libraryId: string, status: 'verified' | 'quarantined'): Promise<void> {
  const { error } = await supabase.from('food_library')
    .update({ validation_status: status, validated_at: new Date().toISOString(), validation_reason: status === 'verified' ? 'Zatwierdzone ręcznie w przeglądzie produktów' : 'Odrzucone ręcznie w przeglądzie produktów' })
    .eq('id', libraryId).eq('user_id', userId);
  if (error) throw error;
}

/** Różnica między kcal z etykiety a kcal policzonymi z makr (4/4/9), w procentach; null gdy brak danych. */
export function energyMismatchPct(candidate: Pick<ReviewCandidate, 'calories' | 'protein' | 'carbs' | 'fat'>): number | null {
  const { calories, protein, carbs, fat } = candidate;
  if (calories == null || protein == null || carbs == null || fat == null || calories <= 0) return null;
  return Math.round(Math.abs(protein * 4 + carbs * 4 + fat * 9 - calories) / calories * 100);
}
