import { supabase } from '../supabase';
import type { Database } from '../database.types';

export type CloserCallRow = Database['public']['Tables']['closer_calls']['Row'];

export interface CallMoment {
  timestamp: string;
  what: string;
  why: string;
}

function isMoment(value: unknown): value is CallMoment {
  return typeof value === 'object' && value !== null && typeof (value as CallMoment).what === 'string';
}

export function callMoments(value: CloserCallRow['ai_mistakes']): CallMoment[] {
  return Array.isArray(value) ? (value as unknown[]).filter(isMoment) : [];
}

export async function fetchCloserCallsForDay(userId: string, date: string): Promise<CloserCallRow[]> {
  const { data, error } = await supabase
    .from('closer_calls')
    .select('*')
    .eq('user_id', userId)
    .eq('call_date', date)
    .order('started_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}
