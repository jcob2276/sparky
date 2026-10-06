import { invokeEdge } from '../supabase';
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

/** Authenticated server owns provider credentials and retrieves public evidence. */
export async function askInvestmentsAnalyst(messages: ChatMessage[]): Promise<AnalystAnswer> {
  const response = await invokeEdge('sync', {
    query: { service: 'investment_ai' },
    body: { messages: messages.filter((m) => m.role !== 'system').slice(-12).map(({ role, content }) => ({ role, content })) },
  }) as unknown as { content?: string; error?: string };
  if (!response.content) throw new Error(response.error || 'Brak odpowiedzi analityka.');
  return { content: response.content, jevEvaluation: null };
}
