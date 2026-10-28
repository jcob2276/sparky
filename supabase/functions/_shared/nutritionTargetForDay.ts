import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { Database } from "./database.types.ts";

/** Kolumny celu, o które pytają wywołujący (podaje się je jako tekst, więc kształt wiersza opisujemy tutaj). */
export interface NutritionTargetRow {
  target_kcal?: number | string | null;
  protein_floor_g?: number | string | null;
}

/**
 * Cel żywieniowy obowiązujący w danym dniu: najnowszy wiersz z `date <= dzień`.
 * Trener zapisuje cel na jutro z wyprzedzeniem, więc ani „najnowszy w ogóle”, ani „dokładnie dziś” nie są poprawne
 * (docs/SINGLE_SOURCE.md). Jedyne miejsce w funkcjach brzegowych, które wybiera ten wiersz.
 */
export async function targetForDay(
  db: SupabaseClient<Database>,
  userId: string,
  day: string,
  columns: string,
): Promise<{ data: NutritionTargetRow | null; error: { message: string } | null }> {
  const { data, error } = await db
    .from("nutrition_targets")
    .select(columns)
    .eq("user_id", userId)
    .lte("date", day)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return { data: (data as unknown as NutritionTargetRow | null) ?? null, error };
}
