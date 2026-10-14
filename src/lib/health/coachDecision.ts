import { invokeEdge } from '../supabase';
import type { CoachDecision } from '@vanguard/domain';
export async function fetchCoachDecision(userId: string): Promise<CoachDecision> {
  const response = await invokeEdge('analyze-training-load', { body: { action: 'coach_decision', userId } });
  if (!response.decision) throw new Error('Brak decyzji treningowej.');
  return response.decision;
}
export async function requestCoachAdjustment(requestKey: string): Promise<string> {
  const response = await invokeEdge('analyze-training-load', { body: { action: 'adapt_plan', requestKey } });
  if (!response.jobId) throw new Error('Nie udało się zapisać zadania korekty.');
  return response.jobId;
}
