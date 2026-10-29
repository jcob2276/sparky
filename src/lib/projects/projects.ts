import { supabase } from '../supabase';
import { unwrap } from '../supabaseUtils';

export async function listProjects(userId: string) {
  return unwrap(
    await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  );
}

