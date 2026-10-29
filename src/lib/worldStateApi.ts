import { supabase } from './supabase';

/**
 * Drop cached world-state rows for the given Warsaw dates so Oracle/Telegram/
 * nightly rebuild from live sources after food or workout corrections (DC-06).
 */
export async function invalidateWorldStateDays(
  userId: string,
  dates: string[],
): Promise<void> {
  const unique = [...new Set(dates.map((d) => d?.trim()).filter(Boolean))];
  if (!userId || unique.length === 0) return;
  try {
    const { error } = await supabase
      .from('vanguard_world_state')
      .delete()
      .eq('user_id', userId)
      .in('date', unique);
    if (error) console.warn('[worldStateApi] invalidate failed:', error.message);
  } catch (err: unknown) {
    // Best-effort: cache wygaśnie samo po TTL, więc błąd nie może przerwać zapisu posiłku/treningu.
    console.warn('[worldStateApi] invalidate failed:', err);
  }
}
