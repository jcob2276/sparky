import { supabase } from '../supabase';
import { confirmDialog } from '../notify';

const WINDOW_MINUTES = 5;

/**
 * Pyta o potwierdzenie, gdy te same pozycje zostały zapisane na ten dzień przed chwilą.
 * Zwraca false, gdy użytkownik rezygnuje. Błąd odczytu nie blokuje zapisu.
 */
export async function confirmIfRecentDuplicate(
  userId: string,
  date: string,
  names: string[],
): Promise<boolean> {
  const unique = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
  if (!unique.length) return true;
  try {
    const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
    const { data, error } = await supabase
      .from('daily_food_entries')
      .select('name')
      .eq('user_id', userId)
      .eq('date', date)
      .gte('created_at', since)
      .in('name', unique)
      .limit(1);
    if (error || !data?.length) return true;
    return await confirmDialog(`„${data[0].name}” zapisano przed chwilą. Dodać drugi raz?`);
  } catch {
    return true;
  }
}
