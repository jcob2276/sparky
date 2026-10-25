import { supabase } from '../supabase';
import type { Database } from '../database.types';

export type CloserCallRow = Database['public']['Tables']['closer_calls']['Row'];
export type CloserCallSummary = Pick<CloserCallRow, 'id' | 'user_id' | 'title' | 'call_date' | 'started_at' |
  'duration_seconds' | 'share_url' | 'ai_status' | 'ai_score' | 'review_notes'>;

const SUMMARY_COLUMNS = 'id,user_id,title,call_date,started_at,duration_seconds,share_url,ai_status,ai_score,review_notes';

export async function fetchCloserCalls(userId: string): Promise<CloserCallSummary[]> {
  const calls: CloserCallSummary[] = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await supabase.from('closer_calls').select(SUMMARY_COLUMNS)
      .eq('user_id', userId).order('started_at', { ascending: false }).order('id', { ascending: false })
      .range(offset, offset + 99);
    if (error) throw error;
    calls.push(...data);
    if (data.length < 100) return calls;
  }
}

export async function fetchCloserCall(userId: string, callId: string): Promise<CloserCallRow> {
  const { data, error } = await supabase.from('closer_calls').select('*')
    .eq('id', callId).eq('user_id', userId).single();
  if (error) throw error;
  return data;
}

export async function saveCloserCallNotes(userId: string, callId: string, notes: string): Promise<CloserCallRow> {
  const { data, error } = await supabase.from('closer_calls')
    .update({ review_notes: notes, updated_at: new Date().toISOString() })
    .eq('id', callId).eq('user_id', userId).select('*').single();
  if (error) throw error;
  return data;
}

