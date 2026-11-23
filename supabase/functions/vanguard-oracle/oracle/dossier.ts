/** Dlugoterminowa pamiec Wyroczni: najnowszy dossier z 90 dni (budowany nocą na VPS, tabela vanguard_dossiers). */
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MAX_CHARS = 11000;
const MAX_AGE_DAYS = 5;

export function formatDossierBlock(content: string, createdAt: string, now: Date = new Date()): string {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return '';
  const ageDays = (now.getTime() - created.getTime()) / 86_400_000;
  if (ageDays > MAX_AGE_DAYS) return '';
  const text = content.trim().slice(0, MAX_CHARS);
  if (!text) return '';
  const day = created.toISOString().slice(0, 10);
  return `[PAMIĘĆ DŁUGOTERMINOWA — dossier z ostatnich 90 dni, stan na ${day}; wiedza wewnętrzna, nie cytuj mechanicznie. Odwołuj się do niej tylko, gdy pasuje do rozmowy, i zawsze z konkretem (data, skala). Najnowsze wypowiedzi Jakuba i dane na żywo mają pierwszeństwo.]\n${text}`;
}

export async function fetchDossier(supabase: SupabaseClient, userId: string): Promise<string> {
  try {
    const { data, error } = await supabase.from('vanguard_dossiers').select('content, created_at')
      .eq('user_id', userId).eq('kind', 'life_90d').order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error || !data) return '';
    return formatDossierBlock(data.content, data.created_at);
  } catch (err) {
    console.error('[oracle] dossier skipped:', err);
    return '';
  }
}
