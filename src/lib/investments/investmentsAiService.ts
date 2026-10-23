import { invokeEdge } from '../supabase';
import { getTodayWarsaw } from '../date';
import { currentYear, yearFloor } from './yearFloor';
import type { SyncInvestmentAiResponse } from '../edgeTypes';
import type { JevSignalEvaluation } from './jevInvestmentClient';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  jevEvaluation?: JevSignalEvaluation | null;
}
export interface AnalystAnswer {
  content: string;
  jevEvaluation: JevSignalEvaluation | null;
}

/** Format DD.MM.RRRR z daty ISO YYYY-MM-DD. */
function plDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

/** Zakres danych: baza trzyma tylko bieżący rok (od 1 stycznia, Europe/Warsaw). */
export function analystDataScopeLabel(today: string = getTodayWarsaw()): string {
  return `dane od ${plDate(yearFloor(today))} do ${plDate(today)}`;
}

/**
 * Notatka o zakresie i formacie dołączana do OSTATNIEJ wiadomości użytkownika tylko w żądaniu
 * (nie trafia do historii). Backend nie jest zmieniany — to wskazówka, nie prompt systemowy.
 */
export function buildAnalystScopeNote(today: string = getTodayWarsaw()): string {
  const year = currentYear(today);
  return [
    `[Zakres danych Sparky: wyłącznie ${analystDataScopeLabel(today)}; starszych danych nie ma.`,
    'Odpowiadaj po polsku, zwięźle. Przy liczbach podaj datę danych i źródło w formie "Źródło: ... · dane do DD.MM.RRRR".',
    `Porównania podaj jako tabelę markdown. Serie kwartalne ogranicz do kwartałów ${year} i podaj jako blok`,
    '```chart {"title":"","unit":"","source":"","asOf":"","bars":[{"label":"Q1 ' + year + '","value":0,"margin":0}]}``` (margin = marża netto w %).',
    'Zakończ zdaniem: Zestawienie danych, nie rekomendacja inwestycyjna.]',
  ].join(' ');
}

/** Authenticated server owns provider credentials and retrieves public evidence. */
export async function askInvestmentsAnalyst(messages: ChatMessage[]): Promise<AnalystAnswer> {
  const response = (await invokeEdge('sync', {
    query: { service: 'investment_ai' },
    body: { messages: withScopeNote(messages.filter((m) => m.role !== 'system').slice(-12).map(({ role, content }) => ({ role, content }))) },
  })) as SyncInvestmentAiResponse;
  const content = typeof response.content === 'string' ? response.content : undefined;
  const error = typeof response.error === 'string' ? response.error : undefined;
  if (!content) throw new Error(error || 'Brak odpowiedzi analityka.');
  return { content, jevEvaluation: null };
}

function withScopeNote(wire: { role: ChatMessage['role']; content: string }[]): { role: ChatMessage['role']; content: string }[] {
  let last = -1;
  wire.forEach((m, i) => { if (m.role === 'user') last = i; });
  if (last < 0) return wire;
  return wire.map((m, i) => (i === last ? { ...m, content: `${m.content}

${buildAnalystScopeNote()}` } : m));
}
