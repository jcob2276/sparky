import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateTrainingPlan, futureTrainingPlan, type TrainingPlanDraft } from '@vanguard/domain';
import { fetchHealthCoachContext } from '../_shared/healthCoachContext.ts';
import { HealthPlanRepo } from './planRepo.ts';
import { trainingConstraintsFromContext } from './planGenerator.ts';
import { HealthPlanInputError } from './planErrors.ts';

export async function approvePlan(client: SupabaseClient, owner: string, body: Record<string, unknown>) {
  const { data: version, error } = await client.from('training_plan_versions').select('*').eq('user_id', owner).eq('id', body.versionId).maybeSingle();
  if (error) throw error;
  if (!version) throw new Error('Training plan not found');
  if (version.status !== 'active') {
    const context = await fetchHealthCoachContext({ supabase: client, userId: owner });
    const validation = validateTrainingPlan(version.snapshot, context, trainingConstraintsFromContext(context));
    if (!validation.plan) throw new HealthPlanInputError(validation.errors.join(' '));
  }
  const { data, error: applyError } = await client.rpc('activate_training_plan', {
    p_owner: owner, p_version: version.id, p_base_revision: body.baseRevision,
    p_request_key: body.requestKey,
  });
  if (applyError) throw applyError;
  return { success: true, versionId: String(data) };
}

export async function revertPlan(client: SupabaseClient, owner: string, body: Record<string, unknown>) {
  const { data: replay } = await client.from('training_plan_versions').select('id').eq('user_id', owner).eq('approval_key', body.requestKey).maybeSingle();
  if (replay) return { success: true, versionId: replay.id };
  const { data: current, error } = await client.from('training_plan_versions').select('*').eq('user_id', owner).eq('status', 'active').maybeSingle();
  if (error) throw error;
  if (!current?.previous_version_id) throw new HealthPlanInputError('Brak wcześniejszego planu do przywrócenia.');
  if (current.revision !== body.baseRevision) throw new Error('Training plan revision conflict');
  const { data: previous, error: previousError } = await client.from('training_plan_versions').select('snapshot').eq('id', current.previous_version_id).eq('user_id', owner).single();
  if (previousError) throw previousError;
  const context = await fetchHealthCoachContext({ supabase: client, userId: owner });
  const snapshot: TrainingPlanDraft = previous.snapshot;
  const proposal = futureTrainingPlan(snapshot, context.localDate);
  const validation = validateTrainingPlan(proposal, context, trainingConstraintsFromContext(context));
  if (!validation.plan) throw new HealthPlanInputError(`Nie można przywrócić dawnego planu: ${validation.errors.join(' ')}`);
  const fingerprint = await new HealthPlanRepo(client).fingerprint(owner);
  const { data: versionId, error: draftError } = await client.rpc('create_health_plan_draft', {
    p_owner: owner, p_snapshot: validation.plan, p_fingerprint: fingerprint, p_base_revision: current.revision,
  });
  if (draftError) throw draftError;
  return approvePlan(client, owner, { versionId, baseRevision: current.revision, requestKey: body.requestKey });
}
