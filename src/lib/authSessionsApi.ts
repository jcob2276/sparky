import { supabase } from './supabase';

export interface ActiveSession {
  id: string;
  user_agent: string | null;
  ip: string | null;
  created_at: string | null;
  last_refreshed_at: string | null;
  is_current: boolean;
}

export async function fetchActiveSessions(): Promise<ActiveSession[]> {
  const { data, error } = await supabase.rpc('list_my_sessions');
  if (error) throw new Error('Nie udało się pobrać aktywnych sesji. Spróbuj ponownie.');
  return data ?? [];
}
