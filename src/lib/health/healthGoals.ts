import { supabase } from '../supabase';
import { invalidateGoalSpineCache } from '../goal/goalSpine.queries';
import { HEALTH_GOAL_PRESETS, validateTrainingConstraints, type HealthGoal, type HealthGoalSpec, type TrainingConstraints } from '@vanguard/domain';

export { HEALTH_GOAL_PRESETS };
export type { HealthGoal, HealthGoalSpec, TrainingConstraints };

function isGoalSpec(value: unknown): value is HealthGoalSpec {
  if (!value || typeof value !== 'object') return false;
  return 'kind' in value && HEALTH_GOAL_PRESETS.some(goal => goal.spec.kind === value.kind)
    && 'priority' in value && typeof value.priority === 'number'
    && 'variant' in value && (value.variant === null || typeof value.variant === 'string')
    && 'standard' in value && (value.standard === null || typeof value.standard === 'string')
    && 'reserveReps' in value && (value.reserveReps === null || typeof value.reserveReps === 'number');
}

export async function fetchHealthGoals(userId: string): Promise<{
  goals: HealthGoal[]; constraints: TrainingConstraints; profileBodyFat: number | null;
}> {
  const [goals, preferences, profile] = await Promise.all([
    supabase.from('goal_kpis').select('*').eq('user_id', userId).not('measurement_spec', 'is', null).order('sort_order'),
    supabase.from('vanguard_preferences').select('value').eq('user_id', userId).eq('key', 'health_coach:constraints').eq('is_active', true).maybeSingle(),
    supabase.from('nutrition_profile').select('goal_body_fat').eq('user_id', userId).maybeSingle(),
  ]);
  for (const result of [goals, preferences, profile]) if (result.error) throw result.error;
  const constraints: TrainingConstraints = preferences.data ? JSON.parse(preferences.data.value)
    : { revision: 0, availability: [], equipment: [], limitations: [] };
  return { goals: (goals.data ?? []).flatMap(row => isGoalSpec(row.measurement_spec) && row.target != null
    ? [{ id: row.id, revision: row.revision, name: row.name, unit: row.unit, target: row.target,
      higherIsBetter: row.higher_is_better, spec: row.measurement_spec }] : []),
    constraints, profileBodyFat: profile.data?.goal_body_fat ?? null };
}

export async function saveHealthGoals(userId: string, goals: HealthGoal[], constraints: TrainingConstraints): Promise<void> {
  const normalized = { ...constraints, equipment: constraints.equipment.map(item => item.trim()).filter(Boolean),
    limitations: constraints.limitations.map(item => item.trim()).filter(Boolean) };
  const errors = validateTrainingConstraints(normalized);
  if (errors.length) throw new Error(errors.join(' '));
  if (goals.some(goal => !Number.isFinite(goal.target) || goal.target <= 0)) throw new Error('Cele muszą mieć dodatnią wartość.');
  // The RPC derives its owner from auth.uid(), checks revisions and synchronizes the nutrition profile atomically.
  const { error } = await supabase.rpc('save_health_goals', {
    p_goals: goals.map(goal => ({ ...goal, spec: { ...goal.spec } })),
    p_constraints: { ...normalized, availability: normalized.availability.map(slot => ({ ...slot })) },
  });
  if (error) throw error;
  invalidateGoalSpineCache(userId);
}
