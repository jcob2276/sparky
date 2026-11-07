import { supabase } from './supabase';

export interface SessionActivity {
  id: string;
  user_agent: string | null;
  ip: string | null;
  created_at: string | null;
  last_refreshed_at: string | null;
  is_current: boolean;
  authentication_methods: string[];
  status: 'active' | 'expired' | 'ended';
  ended_at: string | null;
}

export async function fetchSessionActivity(): Promise<SessionActivity[]> {
  const { data, error } = await supabase.rpc('get_my_session_activity');
  if (error) throw new Error('Nie udało się pobrać aktywnych sesji. Spróbuj ponownie.');
  return (data ?? []).map(row => {
    if (row.status !== 'active' && row.status !== 'expired' && row.status !== 'ended') {
      throw new Error('Nie udało się odczytać statusu sesji.');
    }
    return { ...row, status: row.status };
  });
}

export async function revokeSession(session: SessionActivity): Promise<void> {
  if (session.is_current) {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw new Error('Nie udało się wylogować sesji. Spróbuj ponownie.');
  } else {
    const { data, error } = await supabase.rpc('revoke_my_session', { p_session_id: session.id });
    if (error || !data) throw new Error('Nie udało się wylogować sesji. Odśwież listę i spróbuj ponownie.');
  }
}

export async function revokeOtherSessions(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: 'others' });
  if (error) throw new Error('Nie udało się wylogować pozostałych sesji. Spróbuj ponownie.');
}
