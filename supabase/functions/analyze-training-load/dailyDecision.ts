import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decideTraining, futureTrainingPlan, validateTrainingPlan, type TrainingPlanDraft, type HealthCoachContext } from '@vanguard/domain';
import { trainingConstraintsFromContext } from '../_shared/healthCoachInputs.ts';
import { HealthPlanInputError } from './planErrors.ts';

export async function adjustedTrainingPlan(client: SupabaseClient, owner: string, context: HealthCoachContext): Promise<TrainingPlanDraft> {
  const constraints = trainingConstraintsFromContext(context);
  const decision = decideTraining(context, { constraints });
  if (!decision.original || !decision.replacement) throw new HealthPlanInputError('Na podstawie bieżących danych nie ma korekty sesji do zatwierdzenia.');
  const { data, error } = await client.from('training_plan_versions').select('snapshot').eq('user_id', owner).eq('status', 'active').single();
  if (error) throw error;
  const snapshot: TrainingPlanDraft = data.snapshot;
  if (!Array.isArray(snapshot.sessions) || !Array.isArray(snapshot.deloadWeeks)) throw new HealthPlanInputError('Dotychczasowy plan wymaga przygotowania nowego podglądu.');
  const future = futureTrainingPlan(snapshot, context.localDate);
  if (!future) throw new HealthPlanInputError('Brak przyszłych sesji do zmiany.');
  const proposal = { ...future, title: `${future.title} — korekta`,
    sessions: future.sessions.map(session => session.key === decision.original!.key ? decision.replacement! : session) };
  const validation = validateTrainingPlan(proposal, context, constraints);
  if (!validation.plan) throw new HealthPlanInputError(validation.errors.join(' '));
  return { ...validation.plan, changes: [{ sessionKey: decision.original.key, before: decision.original, after: decision.replacement, why: decision.reasons }] };
}
