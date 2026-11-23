import { supabase } from '../supabase';

export interface AiStatusRow {
  provider: 'vision' | 'text';
  last_ok_at: string | null;
  last_error_at: string | null;
  last_error_kind: 'quota' | 'overload' | 'balance' | 'other' | null;
}

const ACTIVE_WINDOW_MS = 12 * 3600_000;

export async function fetchAiStatus(userId: string): Promise<AiStatusRow[]> {
  const { data, error } = await supabase.from('ai_provider_status')
    .select('provider,last_ok_at,last_error_at,last_error_kind').eq('user_id', userId);
  if (error) throw error;
  return (data ?? []) as AiStatusRow[];
}

const MESSAGES: Record<'vision' | 'text', Partial<Record<NonNullable<AiStatusRow['last_error_kind']>, string>>> = {
  vision: {
    quota: 'Zdjęcia: darmowy limit analizy wyczerpany, odnowi się rano. Opisz posiłek tekstem.',
    overload: 'Zdjęcia: analiza chwilowo przeciążona, spróbuj za chwilę.',
    other: 'Zdjęcia: ostatnia analiza się nie udała.',
  },
  text: {
    balance: 'Opis tekstem działa na zapasowym modelu (główny dostawca nie ma środków), więc może być wolniej.',
    quota: 'Opis tekstem: limit dostawcy AI wyczerpany.',
    overload: 'Opis tekstem: dostawca AI jest chwilowo przeciążony.',
    other: 'Opis tekstem: ostatnie rozpoznanie się nie udało.',
  },
};

/** Komunikaty o dostawcach, których ostatnia próba (do 12 h temu) zakończyła się błędem bez późniejszego sukcesu. */
export function aiStatusNotices(rows: readonly AiStatusRow[], now = Date.now()): string[] {
  return rows.flatMap((row) => {
    if (!row.last_error_at || !row.last_error_kind) return [];
    const errorAt = Date.parse(row.last_error_at);
    if (!Number.isFinite(errorAt) || now - errorAt > ACTIVE_WINDOW_MS) return [];
    if (row.last_ok_at && Date.parse(row.last_ok_at) >= errorAt) return [];
    const message = MESSAGES[row.provider]?.[row.last_error_kind];
    return message ? [message] : [];
  });
}
