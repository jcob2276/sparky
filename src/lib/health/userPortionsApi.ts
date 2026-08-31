import { supabase } from '../supabase';

export interface UserPortionRow {
  name: string;
  grams: number;
  unit: string | null;
}

function normalizePortionName(name: string): string {
  return name.trim().toLocaleLowerCase('pl');
}

export async function fetchUserPortions(userId: string): Promise<Map<string, UserPortionRow>> {
  const { data, error } = await supabase
    .from('user_portions')
    .select('name, grams, unit')
    .eq('user_id', userId);
  if (error) throw error;
  const map = new Map<string, UserPortionRow>();
  for (const row of data ?? []) {
    map.set(normalizePortionName(row.name), {
      name: row.name,
      grams: row.grams,
      unit: row.unit,
    });
  }
  return map;
}

export function lookupUserPortion(
  portions: Map<string, UserPortionRow>,
  productName: string,
): UserPortionRow | null {
  return portions.get(normalizePortionName(productName)) ?? null;
}

async function upsertUserPortion(
  userId: string,
  name: string,
  grams: number,
  unit?: string | null,
): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  const { error } = await supabase.from('user_portions').upsert({
    user_id: userId,
    name: trimmed,
    grams: Math.max(1, Math.round(grams)),
    unit: unit ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,name' });
  if (error) throw error;
}

export async function upsertUserPortionsFromDraft(
  userId: string,
  items: Array<{ name: string; grams: number; unit?: string }>,
): Promise<void> {
  for (const item of items) {
    await upsertUserPortion(userId, item.name, item.grams, item.unit);
  }
}
