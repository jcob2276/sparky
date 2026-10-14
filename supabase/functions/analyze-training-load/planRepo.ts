import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { TrainingPlanDraft } from '@vanguard/domain';

export interface CoachJob {
  id: string; user_id: string; payload: Record<string, unknown>; lease_token: string; attempts: number;
}
export class HealthPlanRepo {
  constructor(readonly client: SupabaseClient) {}
  async enqueue(owner: string, requestKey: string, payload: Record<string, unknown>) {
    const { data, error } = await this.client.rpc('enqueue_health_coach_job', { p_owner: owner, p_request_key: requestKey, p_payload: payload });
    if (error) throw error;
    return String(data);
  }
  async claim(jobId: string): Promise<CoachJob | null> {
    const { data, error } = await this.client.rpc('claim_health_coach_job', { p_job: jobId });
    if (error) throw error;
    return data?.[0] ?? null;
  }
  async fingerprint(owner: string): Promise<string> {
    const { data, error } = await this.client.rpc('health_coach_fingerprint', { p_owner: owner });
    if (error) throw error;
    return String(data);
  }
  async complete(job: CoachJob, plan: TrainingPlanDraft, fingerprint: string): Promise<string> {
    const { data, error } = await this.client.rpc('complete_health_plan_job', {
      p_job: job.id, p_token: job.lease_token, p_snapshot: plan, p_fingerprint: fingerprint,
    });
    if (error) throw error;
    return String(data);
  }
  async fail(job: CoachJob, errorMessage: string) {
    const { error } = await this.client.rpc('fail_health_coach_job', { p_job: job.id, p_token: job.lease_token, p_error: errorMessage });
    if (error) throw error;
  }
}
