import { supabase } from '../supabase';
import { unwrapList } from '../supabaseUtils';

export interface BrainHealthRow {
  table_name: string;
  total_records: number;
  embedded_records: number;
  coverage_percent: number;
}

export async function fetchBrainHealthReport(userId: string): Promise<BrainHealthRow[]> {
  const res = await supabase.rpc('get_brain_health_report', { user_id_param: userId });
  return unwrapList(res) as BrainHealthRow[];
}
