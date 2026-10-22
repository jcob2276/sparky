import { supabase } from '../supabase';

export type Supplement = {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  emoji: string;
  unit: string;
  dose_per_unit: Record<string, unknown>;
  sort_order: number;
  active: boolean;
  start_date: string | null;
  end_date: string | null;
  reminder_time: string | null;
  reminder_sent_date: string | null;
  skip_qty: boolean;
  created_at: string;
};

export type SupplementLog = {
  id: string;
  user_id: string;
  supplement_id: string;
  quantity: number;
  date: string;
  logged_at: string;
  note: string | null;
};

export async function fetchSupplements(userId: string): Promise<Supplement[]> {
  const { data, error } = await supabase
    .from('supplements')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []) as Supplement[];
}

export async function fetchSupplementLogsSince(
  userId: string,
  sinceDate: string,
): Promise<SupplementLog[]> {
  const { data, error } = await supabase
    .from('supplement_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('date', sinceDate)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data || []) as SupplementLog[];
}


