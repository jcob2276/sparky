/**
 * echoes.ts
 * „Twoje słowa wracają": dosłowne fragmenty dawnych wpisów Jakuba (strumień Telegrama, dziennik) podobne do tego, co pisze teraz.
 * Cytaty z datą, bez interpretacji; model sam decyduje, czy pasują. Fetch nigdy nie rzuca.
 * Starsze niż okno 90 dni z `match_vanguard_content` też są szukane (dziennik trwa od maja).
 */
import { getEmbedding } from "../../_shared/openai.ts";

export interface EchoRow { table_name: string; content: string; source_date: string; similarity: number }

const MIN_QUERY_CHARS = 30;
const MIN_ECHO_CHARS = 80;
const MIN_AGE_DAYS = 2;
const MAX_ECHOES = 3;

function daysBetween(fromDate: string, today: string): number {
  return Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / 86400000);
}

function plAgo(days: number): string {
  if (days < 14) return `${days} dni temu`;
  if (days < 60) return `${Math.round(days / 7)} tyg. temu`;
  return `${Math.round(days / 30)} mies. temu`;
}

function excerpt(text: string, n = 260): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

/** Wybiera do 3 najlepszych ech: dość długie, nie z ostatnich dni (te i tak są w kontekście), po jednym na dzień. */
export function pickEchoes(rows: EchoRow[], today: string): EchoRow[] {
  const seenDays = new Set<string>();
  const out: EchoRow[] = [];
  const sorted = [...rows].sort((a, b) => b.similarity - a.similarity);
  for (const r of sorted) {
    if (!['vanguard_stream', 'daily_wins'].includes(r.table_name)) continue;
    if (!r.content || r.content.trim().length < MIN_ECHO_CHARS) continue;
    if (daysBetween(r.source_date, today) < MIN_AGE_DAYS) continue;
    if (seenDays.has(r.source_date)) continue;
    seenDays.add(r.source_date);
    out.push(r);
    if (out.length >= MAX_ECHOES) break;
  }
  return out;
}

export function formatEchoes(echoes: EchoRow[], today: string): string {
  if (echoes.length === 0) return '';
  return [
    '[TWOJE WŁASNE SŁOWA Z PRZESZŁOŚCI — dosłowne fragmenty wpisów Jakuba podobne do tego, co pisze teraz]:',
    ...echoes.map((e) => `- ${e.source_date} (${plAgo(daysBetween(e.source_date, today))}): „${excerpt(e.content)}"`),
    'ZASADA: wspomnij o takim echu tylko, gdy naprawdę pasuje i coś dodaje. Cytuj jego słowa i podaj, kiedy to padło; nie parafrazuj na diagnozę. Jeśli myśl wraca w zmienionej formie, pokaż zmianę („wtedy… a dziś…"), nie zarzut powtarzania. Echo może być nietrafione: wtedy je pomiń.',
  ].join('\n');
}

// deno-lint-ignore no-explicit-any
export async function fetchEchoes(supabase: any, userId: string, query: string | null | undefined, today: string): Promise<string> {
  const q = (query ?? '').trim();
  if (q.length < MIN_QUERY_CHARS) return '';
  try {
    const embedding = await getEmbedding(q.substring(0, 1000), Deno.env.get('GEMINI_API_KEY') ?? '');
    if (!embedding) return '';
    const { data, error } = await supabase.rpc('match_vanguard_content', {
      query_embedding: embedding, match_threshold: 0.55, match_count: 25, user_id_param: userId, max_age_days: 400,
    });
    if (error) { console.warn('[oracle] echoes rpc failed:', error); return ''; }
    const rows: EchoRow[] = (data ?? []).map((r: Record<string, unknown>) => ({
      table_name: String(r.table_name), content: String(r.content ?? ''), source_date: String(r.source_date), similarity: Number(r.similarity),
    }));
    return formatEchoes(pickEchoes(rows, today), today);
  } catch (e) {
    console.warn('[oracle] echoes failed (non-fatal):', e);
    return '';
  }
}
