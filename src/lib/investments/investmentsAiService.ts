import { invokeEdge } from '../supabase';
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

/** Authenticated server owns provider credentials and retrieves public evidence. */
export async function askInvestmentsAnalyst(messages: ChatMessage[]): Promise<AnalystAnswer> {
  const response = (await invokeEdge('sync', {
    query: { service: 'investment_ai' },
    body: { messages: messages.filter((m) => m.role !== 'system').slice(-12).map(({ role, content }) => ({ role, content })) },
  })) as SyncInvestmentAiResponse;
  const content = typeof response.content === 'string' ? response.content : undefined;
  const error = typeof response.error === 'string' ? response.error : undefined;
  if (!content) throw new Error(error || 'Brak odpowiedzi analityka.');
  return { content, jevEvaluation: null };
}
