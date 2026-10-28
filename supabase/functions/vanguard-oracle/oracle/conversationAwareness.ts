/**
 * conversationAwareness.ts
 * Blok „TERAZ" dla Wyroczni: rytm rozmowy (kiedy ostatnio rozmawialiśmy, czy bot zostawił pytanie bez odpowiedzi),
 * ostatni posiłek, najbliższe wydarzenia, zadania na dziś i zobowiązania czekające na Pokea.
 * Same fakty z datami i godzinami — model ma z nich korzystać, nie zgadywać.
 * Funkcje formatujące są czyste (bez Deno/Supabase), fetch nigdy nie rzuca.
 */

import { getWarsawDateString as warsawDay } from '../../../../packages/domain/src/date.ts';

interface AwarenessChatRow { role: string; content: string; created_at: string | null }
interface AwarenessMealRow { name: string; calories: number | null; protein: number | null; created_at: string | null }
interface AwarenessEventRow { summary: string | null; start_time: string | null; end_time: string | null; location: string | null }
interface AwarenessTodoRow { title: string; due_date: string | null; is_important: boolean }
interface AwarenessPendingRow { send_after: string; text: string }

export interface AwarenessInput {
  now: Date;
  todayDate: string;
  chat: AwarenessChatRow[];
  meals: AwarenessMealRow[];
  events: AwarenessEventRow[];
  todos: AwarenessTodoRow[];
  pending: AwarenessPendingRow[];
}

const TZ = 'Europe/Warsaw';

function hhmm(iso: string | null | undefined): string {
  if (!iso) return '?';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '?';
  return d.toLocaleTimeString('pl-PL', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
}

/** „12 min temu", „3 h 20 min temu", „2 dni temu" — liczone w minutach, bez zaokrąglania do „wczoraj". */
export function humanGap(fromMs: number, toMs: number): string {
  const min = Math.max(0, Math.round((toMs - fromMs) / 60000));
  if (min < 1) return 'przed chwilą';
  if (min < 60) return `${min} min temu`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h${min % 60 ? ` ${min % 60} min` : ''} temu`;
  const days = Math.floor(h / 24);
  return `${days} ${days === 1 ? 'dzień' : 'dni'} temu`;
}

function clip(s: string, n: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

function endsWithQuestion(content: string): boolean {
  return /\?\s*$/.test(content.replace(/\[SPLIT\]/g, ' ').trim());
}

/** Ile ostatnich odpowiedzi asystenta z rzędu (od najnowszej) kończyło się pytaniem; maks. 3 wierszy wstecz. */
function trailingQuestionStreak(rows: AwarenessChatRow[]): number {
  let n = 0;
  for (const r of rows.filter((x) => x.role === 'assistant').slice(0, 3)) {
    if (!endsWithQuestion(r.content)) break;
    n++;
  }
  return n;
}

function chatLines(input: AwarenessInput): string[] {
  const { chat, now } = input;
  const rows = chat.filter((r) => r.created_at);
  if (rows.length === 0) return ['Rozmowa: to pierwsza wiadomość w historii czatu.'];
  const last = rows[0];
  const lastMs = new Date(last.created_at as string).getTime();
  const lines = [`Ostatnia wymiana w czacie: ${hhmm(last.created_at)} (${humanGap(lastMs, now.getTime())}).`];
  const sameDay = warsawDay(new Date(lastMs)) === input.todayDate;
  if (!sameDay) lines.push('To pierwsza rozmowa dzisiaj — nie zaczynaj w pół zdania poprzedniego dnia.');
  const lastAssistant = rows.find((r) => r.role === 'assistant');
  if (lastAssistant && endsWithQuestion(lastAssistant.content)) {
    const ago = humanGap(new Date(lastAssistant.created_at as string).getTime(), now.getTime());
    lines.push(`Twoje ostatnie pytanie do Jakuba (${ago}): „${clip(lastAssistant.content, 140)}". Jeśli obecna wiadomość to odpowiedź na nie, potraktuj ją jak odpowiedź.`);
  }
  const streak = trailingQuestionStreak(rows);
  if (streak >= 1) {
    lines.push(`WYMÓG FORMY: ${streak === 1 ? 'Twoja ostatnia odpowiedź' : `Twoje ostatnie ${streak} odpowiedzi`} kończył${streak === 1 ? 'a się' : 'y się'} pytaniem. Ta odpowiedź NIE może kończyć się pytaniem (zakończ myślą, uznaniem albo zdaniem bez znaku zapytania), chyba że bez odpowiedzi na pytanie nic sensownego nie powiesz.`);
  }
  return lines;
}

function mealLine(input: AwarenessInput): string {
  const meals = input.meals.filter((m) => m.created_at);
  if (meals.length === 0) return 'Jedzenie dziś: nic nie zalogowano (to brak wpisu, nie dowód że nie jadł).';
  const last = meals[0];
  const ago = humanGap(new Date(last.created_at as string).getTime(), input.now.getTime());
  const kcal = last.calories != null ? `, ${Math.round(last.calories)} kcal` : '';
  return `Ostatni zalogowany posiłek: ${hhmm(last.created_at)} (${ago}) — ${clip(last.name, 60)}${kcal}. Wpisów dziś: ${meals.length}.`;
}

function eventLines(input: AwarenessInput): string[] {
  const nowMs = input.now.getTime();
  const out: string[] = [];
  for (const e of input.events.slice(0, 4)) {
    if (!e.start_time || !e.summary) continue;
    const s = new Date(e.start_time).getTime();
    const en = e.end_time ? new Date(e.end_time).getTime() : s;
    const when = s <= nowMs && en >= nowMs
      ? `TRWA teraz (do ${hhmm(e.end_time)})`
      : `za ${Math.max(1, Math.round((s - nowMs) / 60000))} min (${hhmm(e.start_time)})`;
    out.push(`- ${clip(e.summary, 70)} — ${when}${e.location ? `, ${clip(e.location, 40)}` : ''}`);
  }
  return out.length ? ['Najbliższe wydarzenia kalendarza:', ...out] : ['Najbliższe 6 h w kalendarzu: pusto.'];
}

function todoLines(input: AwarenessInput): string[] {
  const overdue = input.todos.filter((t) => t.due_date && t.due_date < input.todayDate);
  const today = input.todos.filter((t) => t.due_date === input.todayDate);
  if (overdue.length === 0 && today.length === 0) return [];
  const fmt = (t: AwarenessTodoRow) => `${t.is_important ? '★ ' : ''}${clip(t.title, 60)}`;
  const lines: string[] = [];
  if (today.length) lines.push(`Zadania na dziś otwarte (${today.length}): ${today.slice(0, 4).map(fmt).join('; ')}.`);
  if (overdue.length) lines.push(`Zaległe (${overdue.length}), najstarsze: ${overdue.slice(0, 3).map((t) => `${fmt(t)} (termin ${t.due_date})`).join('; ')}.`);
  return lines;
}

function pendingLines(input: AwarenessInput): string[] {
  if (input.pending.length === 0) return [];
  return [
    'Zaplanowane pingi do Jakuba (jeszcze nie wysłane):',
    ...input.pending.slice(0, 3).map((p) => `- ${hhmm(p.send_after)}: ${clip(p.text.replace(/\n.*/s, ''), 90)}`),
  ];
}

export function formatConversationAwareness(input: AwarenessInput): string {
  const lines = [
    '[TERAZ — SYTUACJA WOKÓŁ TEJ ROZMOWY (fakty z godzinami, Europe/Warsaw)]:',
    ...chatLines(input),
    mealLine(input),
    ...eventLines(input),
    ...todoLines(input),
    ...pendingLines(input),
    'ZASADA: odwołuj się do tych faktów, gdy pasują do tego, co Jakub pisze (posiłek, wydarzenie, zadanie, odpowiedź na Twoje pytanie). Nie wymieniaj ich na siłę. Brak wpisu ≠ brak zdarzenia.',
  ];
  return lines.join('\n');
}

// deno-lint-ignore no-explicit-any
export async function fetchConversationAwareness(supabase: any, userId: string, now: Date, todayDate: string): Promise<string> {
  const nowIso = now.toISOString();
  const horizonIso = new Date(now.getTime() + 6 * 3600 * 1000).toISOString();
  const safe = async <T>(p: PromiseLike<{ data: T | null; error: unknown }>): Promise<T | null> => {
    try {
      const { data, error } = await p;
      if (error) { console.warn('[oracle] awareness query failed:', error); return null; }
      return data;
    } catch (e) { console.warn('[oracle] awareness query threw:', e); return null; }
  };

  const [chat, meals, events, todos, pending] = await Promise.all([
    safe<AwarenessChatRow[]>(supabase.from('ai_chat_messages').select('role, content, created_at')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(6)),
    safe<AwarenessMealRow[]>(supabase.from('daily_food_entries').select('name, calories, protein, created_at')
      .eq('user_id', userId).eq('date', todayDate).order('created_at', { ascending: false }).limit(30)),
    safe<AwarenessEventRow[]>(supabase.from('vanguard_calendar').select('summary, start_time, end_time, location')
      .eq('user_id', userId).eq('is_all_day', false).gte('end_time', nowIso).lte('start_time', horizonIso)
      .order('start_time', { ascending: true }).limit(8)),
    safe<AwarenessTodoRow[]>(supabase.from('todo_items').select('title, due_date, is_important')
      .eq('user_id', userId).eq('status', 'open').lte('due_date', todayDate)
      .order('due_date', { ascending: true }).limit(12)),
    safe<{ send_after: string; payload: { body?: { text?: string } } | null }[]>(
      supabase.from('outbound_messages').select('send_after, payload')
        .eq('user_id', userId).eq('status', 'pending').gte('send_after', nowIso)
        .order('send_after', { ascending: true }).limit(3)),
  ]);

  return formatConversationAwareness({
    now,
    todayDate,
    chat: chat ?? [],
    meals: meals ?? [],
    // „Sen" w kalendarzu to podsumowanie z Oury, nie wydarzenie (lekcja z kalendarza)
    events: (events ?? []).filter((e) => !/^sen\b/i.test((e.summary ?? '').trim())),
    todos: todos ?? [],
    pending: (pending ?? []).map((p) => ({ send_after: p.send_after, text: p.payload?.body?.text ?? '' })).filter((p) => p.text),
  });
}
