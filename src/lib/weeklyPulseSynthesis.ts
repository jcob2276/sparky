import { invokeEdge } from './supabase';

export async function fetchWeeklyPulseSynthesis(prompt: string): Promise<string> {
  const response = await invokeEdge('vanguard-oracle', { body: { query: prompt, question: prompt } });
  const text = [response?.answer, response?.reply, response?.text, response?.response, response?.content]
    .find((value): value is string => typeof value === 'string' && value.trim().length > 0);
  if (!text) throw new Error('Oracle nie zwrócił syntezy tygodnia.');
  return text.trim();
}
