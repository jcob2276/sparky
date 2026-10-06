import { invokeEdge } from './supabase';
import type { DailyPlanInterviewResponse } from './edgeTypes';
import { submitMorningPlanRpc, type MorningPlanSlotInput } from './morningPlanApi';

export interface PlanSlotItem {
  slot: number;
  category: 'cialo' | 'duch' | 'konto' | 'general';
  title: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Transcribes an audio recording using OpenAI Whisper via vanguard-capture.
 */
export async function transcribeVoiceRecording(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  form.append('action', 'transcribe_only');

  const result = await invokeEdge('vanguard-capture', { body: form });
  if (!('type' in result) || result.type !== 'transcription') {
    throw new Error('Usługa nie zwróciła transkrypcji nagrania.');
  }
  return result.transcript.trim();
}

/**
 * Exchanges a message turn with Sparky in the Daily Plan Voice Interview.
 */
export async function converseDailyPlan({
  userId,
  planningDate,
  messages,
  currentSlots,
}: {
  userId: string;
  planningDate: string;
  messages: ConversationMessage[];
  currentSlots?: PlanSlotItem[];
}): Promise<DailyPlanInterviewResponse> {
  const result = await invokeEdge('vanguard-oracle', {
    body: {
      action: 'daily-plan-interview',
      userId,
      planningDate,
      messages,
      currentSlots,
    },
  });

  const response = result as unknown as DailyPlanInterviewResponse;
  if (!response || typeof response.reply !== 'string' || !Array.isArray(response.slots)) {
    throw new Error('Niepoprawna odpowiedź asystenta planowania.');
  }

  return response;
}

/**
 * Atomically saves the 5 planned priority slots into daily_wins + daily_win_tasks.
 */
export async function saveInterviewPlan(
  userId: string,
  planningDate: string,
  slots: PlanSlotItem[],
): Promise<string> {
  const formattedSlots: MorningPlanSlotInput[] = slots
    .filter((s) => Boolean(s.title.trim()))
    .map((s) => ({
      slot: s.slot,
      title: s.title.trim(),
      category: s.category || (s.slot === 1 ? 'cialo' : s.slot === 2 ? 'duch' : s.slot === 3 ? 'konto' : 'general'),
      todo_id: null,
    }));

  return await submitMorningPlanRpc(userId, planningDate, formattedSlots, []);
}
