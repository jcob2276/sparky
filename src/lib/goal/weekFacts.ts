import { useQuery } from '@tanstack/react-query';
import { goalSpineKeys } from '../queryKeys';
import { supabase } from '../supabase';

/** Fakty jednego tygodnia policzone w bazie (funkcja week_facts); null znaczy brak danych, nie zero. */
export interface WeekFacts {
  week_start: string;
  days_elapsed: number;
  own_entry_days: number;
  own_words: number;
  days_closed: number;
  wins_z: number;
  wins_p: number;
  tasks_planned: number;
  tasks_done: number;
  workouts: number;
  saunas: number;
  sleep_nights: number;
  sleep_avg_h: number | null;
  readiness_avg: number | null;
  spend_pln: number;
  spend_tx: number;
  review_done: boolean;
  review_answers: boolean;
}

type CoverageStatus = 'ok' | 'gap' | 'info';
export interface CoverageRow { key: string; label: string; value: string; status: CoverageStatus }

const hours = (value: number | null) => (value == null ? 'brak' : `${value.toFixed(1).replace('.', ',')} h`);
const pln = (value: number) => `${Math.round(value).toLocaleString('pl-PL')} zł`;

/** Jedna lista wierszy: czy tydzień ma komplet zapisów, czy są luki. Luka to brak danych, nie brak aktywności. */
export function buildWeekCoverage(facts: WeekFacts): CoverageRow[] {
  const days = Math.max(1, facts.days_elapsed);
  return [
    { key: 'entries', label: 'Twoje wpisy', value: `${facts.own_entry_days}/${days} dni`, status: facts.own_entry_days >= Math.min(4, days) ? 'ok' : 'gap' },
    { key: 'closed', label: 'Domknięte dni', value: `${facts.days_closed}/${days}`, status: facts.days_closed >= days - 1 ? 'ok' : 'gap' },
    { key: 'tasks', label: 'Zadania dnia', value: facts.tasks_planned ? `${facts.tasks_done}/${facts.tasks_planned}` : 'brak planu', status: facts.tasks_planned ? 'info' : 'gap' },
    { key: 'training', label: 'Treningi', value: `${facts.workouts}${facts.saunas ? ` + ${facts.saunas} sauna` : ''}`, status: facts.workouts > 0 ? 'ok' : 'gap' },
    { key: 'sleep', label: 'Sen', value: `${facts.sleep_nights}/${days} nocy · ${hours(facts.sleep_avg_h)}`, status: facts.sleep_nights >= days - 1 ? 'ok' : 'gap' },
    { key: 'review', label: 'Przegląd', value: facts.review_done ? 'zrobiony' : 'czeka', status: facts.review_done ? 'ok' : 'gap' },
  ];
}

/** Skrócony raport tygodnia: liczby z bazy i osobno luki. Bez wniosków o przyczynach. */
export function buildWeekReport(facts: WeekFacts): { lines: string[]; gaps: string[] } {
  const lines = [
    `Z/P: ${facts.wins_z} Z, ${facts.wins_p} P (domknięte dni: ${facts.days_closed})`,
    `Zadania: ${facts.tasks_done}/${facts.tasks_planned}`,
    `Sen: ${hours(facts.sleep_avg_h)}, gotowość ${facts.readiness_avg ?? 'brak'}`,
    `Treningi: ${facts.workouts}, sauny: ${facts.saunas}`,
    `Twoje słowa: ${facts.own_words} w ${facts.own_entry_days} dniach`,
    `Wydatki: ${pln(facts.spend_pln)} (${facts.spend_tx} transakcji)`,
  ];
  const gaps = buildWeekCoverage(facts).filter((row) => row.status === 'gap').map((row) => `${row.label}: ${row.value}`);
  return { lines, gaps };
}

async function fetchWeekFacts(userId: string, weekStart: string): Promise<WeekFacts> {
  const { data, error } = await supabase.rpc('week_facts', { p_user: userId, p_week_start: weekStart });
  if (error) throw error;
  return parseWeekFacts(data);
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const num = (row: Record<string, unknown>, key: string): number => {
  const value = row[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
};
const numOrNull = (row: Record<string, unknown>, key: string): number | null => {
  const value = row[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

/** Odpowiedz RPC to JSON bez typu: pola sprawdzamy jawnie, brak liczby to 0 (a dla srednich null), nie zgadywanie. */
function parseWeekFacts(raw: unknown): WeekFacts {
  if (!isRecord(raw) || typeof raw.week_start !== 'string') throw new Error('week_facts: nieprawidlowa odpowiedz');
  return {
    week_start: raw.week_start,
    days_elapsed: num(raw, 'days_elapsed'),
    own_entry_days: num(raw, 'own_entry_days'),
    own_words: num(raw, 'own_words'),
    days_closed: num(raw, 'days_closed'),
    wins_z: num(raw, 'wins_z'),
    wins_p: num(raw, 'wins_p'),
    tasks_planned: num(raw, 'tasks_planned'),
    tasks_done: num(raw, 'tasks_done'),
    workouts: num(raw, 'workouts'),
    saunas: num(raw, 'saunas'),
    sleep_nights: num(raw, 'sleep_nights'),
    sleep_avg_h: numOrNull(raw, 'sleep_avg_h'),
    readiness_avg: numOrNull(raw, 'readiness_avg'),
    spend_pln: num(raw, 'spend_pln'),
    spend_tx: num(raw, 'spend_tx'),
    review_done: raw.review_done === true,
    review_answers: raw.review_answers === true,
  };
}

export function useWeekFacts(userId: string, weekStart: string) {
  return useQuery({
    queryKey: goalSpineKeys.weekFacts(userId, weekStart),
    enabled: Boolean(userId),
    staleTime: 60_000,
    queryFn: () => fetchWeekFacts(userId, weekStart),
  });
}
