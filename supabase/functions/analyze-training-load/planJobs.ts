import type { TrainingPlanDraft, HealthCoachContext } from '@vanguard/domain';
import type { CoachJob, HealthPlanRepo } from './planRepo.ts';

export interface PlanJobDependencies {
  repo: Pick<HealthPlanRepo, 'claim' | 'fingerprint' | 'complete' | 'fail'>;
  context: (owner: string) => Promise<HealthCoachContext>;
  generate: (context: HealthCoachContext, request: Record<string, unknown>, owner: string) => Promise<TrainingPlanDraft>;
}
export async function runPlanJob(jobId: string, deps: PlanJobDependencies): Promise<{ status: string; versionId?: string }> {
  const job: CoachJob | null = await deps.repo.claim(jobId);
  if (!job) return { status: 'not_claimed' };
  try {
    // Capture before reads. Changed assumptions will invalidate this draft at approval.
    const fingerprint = await deps.repo.fingerprint(job.user_id);
    const context = await deps.context(job.user_id);
    const plan = await deps.generate(context, job.payload, job.user_id);
    const versionId = await deps.repo.complete(job, plan, fingerprint);
    return { status: 'completed', versionId };
  } catch (error) {
    await deps.repo.fail(job, error instanceof Error ? error.message : 'Plan generation failed');
    return { status: job.attempts >= 3 ? 'failed' : 'queued' };
  }
}
