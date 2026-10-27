/**
 * pillars.ts
 * „Trzy filary" Jakuba (Konto, Ciało, Duch) jako kompas rozmowy: jego własne słowa z life_goals plus liczby tygodniowe z goal_kpis.
 * Wszystko poza tymi trzema filarami to dla niego szum, więc bot ma łączyć wypowiedzi z filarami, a nie oceniać ich liczbami.
 * Funkcja formatująca jest czysta, fetch nigdy nie rzuca.
 */

interface PillarGoals {
  goal_konto: string | null; goal_cialo: string | null; goal_duch: string | null;
  date_konto: string | null; date_cialo: string | null; date_duch: string | null;
  anti_goal_konto: string | null; anti_goal_cialo: string | null; anti_goal_duch: string | null;
}
interface PillarKpi { name: string; unit: string | null; target: number | null; pillar: string | null }

function clip(s: string, n: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

export function formatPillars(goals: PillarGoals | null, kpis: PillarKpi[]): string {
  if (!goals) return '';
  const rows: [string, string | null, string | null, string | null, string][] = [
    ['Konto', goals.goal_konto, goals.date_konto, goals.anti_goal_konto, 'konto'],
    ['Ciało', goals.goal_cialo, goals.date_cialo, goals.anti_goal_cialo, 'cialo'],
    ['Duch', goals.goal_duch, goals.date_duch, goals.anti_goal_duch, 'duch'],
  ];
  const lines = rows.filter(([, goal]) => goal?.trim()).map(([name, goal, date, anti, key]) => {
    const kpiText = kpis.filter((k) => k.pillar === key && k.target != null).map((k) => `${k.name} ${k.target} ${k.unit ?? ''}`.trim());
    return `- ${name}${date ? ` (do ${date})` : ''}: ${clip(goal as string, 520)}${kpiText.length ? ` Wskaźniki w systemie: ${kpiText.join('; ')}.` : ''}${anti?.trim() ? ` Czego unikać: ${clip(anti, 160)}.` : ''}`;
  });
  if (lines.length === 0) return '';
  return [
    '[TRZY FILARY JAKUBA — jego własne cele; nic poza nimi się dla niego nie liczy]:',
    ...lines,
    'ZASADA: gdy wypowiedź Jakuba dotyczy któregoś filaru, nazwij go po prostu („to jest Duch: dotrzymywanie słowa") i zapytaj najwyżej o jego własną miarę. Nie oceniaj go tymi celami, nie rozliczaj z liczb, gdy o nie nie pyta. Rzeczy spoza filarów traktuj jako tło, nie dopytuj o nie. Przy śnie liczy się regularność, REM i sen głęboki oraz to, jak się wyspał, a nie sama liczba godzin.',
  ].join('\n');
}

// deno-lint-ignore no-explicit-any
export async function fetchPillars(supabase: any, userId: string): Promise<string> {
  try {
    const [goalsRes, kpisRes] = await Promise.all([
      supabase.from('life_goals')
        .select('goal_konto, goal_cialo, goal_duch, date_konto, date_cialo, date_duch, anti_goal_konto, anti_goal_cialo, anti_goal_duch')
        .eq('user_id', userId).maybeSingle(),
      supabase.from('goal_kpis').select('name, unit, target, pillar').eq('user_id', userId).order('sort_order', { ascending: true }),
    ]);
    return formatPillars(goalsRes.data ?? null, kpisRes.data ?? []);
  } catch (e) {
    console.warn('[oracle] pillars failed (non-fatal):', e);
    return '';
  }
}
