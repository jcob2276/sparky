import { TIMEOUTS } from '../constants';
import { invokeEdge, supabase } from '../supabase';
import { scheduleNutritionRefresh } from './nutritionSideEffects';
import {
  buildIntegrityView, energyFixCalories, jsonRecord, sortFindings,
  type IntegrityFindingRow, type IntegrityView,
} from './foodIntegrityView';

export interface FoodIntegrity {
  ranAt: string | null;
  view: IntegrityView;
  findings: IntegrityFindingRow[];
}

export async function fetchFoodIntegrity(userId: string): Promise<FoodIntegrity> {
  const [findingsRes, runRes] = await Promise.all([
    supabase.from('food_integrity_findings')
      .select('id,kind,severity,entity_id,message,detail,auto_fix')
      .eq('user_id', userId).eq('status', 'open'),
    supabase.from('food_integrity_runs')
      .select('ran_at,summary')
      .eq('user_id', userId).order('ran_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (findingsRes.error) throw findingsRes.error;
  if (runRes.error) throw runRes.error;
  const findings = sortFindings((findingsRes.data ?? []).map((row) => ({
    id: row.id, kind: row.kind, severity: row.severity, entityId: row.entity_id,
    message: row.message, detail: jsonRecord(row.detail), autoFix: row.auto_fix,
  })));
  return { ranAt: runRes.data?.ran_at ?? null, view: buildIntegrityView(runRes.data?.summary ?? null), findings };
}

export async function dismissFinding(
  userId: string,
  findingId: string,
  status: 'dismissed' | 'resolved' = 'dismissed',
): Promise<void> {
  const { error } = await supabase.from('food_integrity_findings')
    .update({ status, resolved_at: new Date().toISOString() })
    .eq('id', findingId).eq('user_id', userId);
  if (error) throw error;
}

/** Poprawia kcal wpisu na wartość z makro (jawna decyzja użytkownika), zostawiając ślad w `parse_meta`. */
export async function acceptEnergyFix(userId: string, finding: IntegrityFindingRow): Promise<void> {
  const calories = energyFixCalories(finding);
  if (calories == null || !finding.entityId) throw new Error('To znalezisko nie ma bezpiecznej poprawki kcal');
  const { data, error } = await supabase.from('daily_food_entries')
    .select('calories,date,parse_meta').eq('id', finding.entityId).eq('user_id', userId).single();
  if (error) throw error;
  const parseMeta = {
    ...jsonRecord(data.parse_meta),
    energy_corrected_from: data.calories,
    energy_corrected_at: new Date().toISOString(),
  };
  const update = await supabase.from('daily_food_entries')
    .update({ calories, parse_meta: parseMeta }).eq('id', finding.entityId).eq('user_id', userId);
  if (update.error) throw update.error;
  await dismissFinding(userId, finding.id, 'resolved');
  scheduleNutritionRefresh(userId, data.date);
}

export async function runFoodIntegrityAuditNow(): Promise<void> {
  await invokeEdge('food-integrity-audit', { body: {}, signal: AbortSignal.timeout(TIMEOUTS.heavy) });
}
