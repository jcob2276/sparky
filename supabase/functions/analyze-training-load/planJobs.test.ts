import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { runPlanJob, type PlanJobDependencies } from './planJobs.ts';
import { buildHealthCoachContext } from '../_shared/healthCoachContext.ts';

Deno.test('a job without a lease does not fetch private data or call the model', async () => {
  const calls: string[] = [];
  const deps: PlanJobDependencies = {
    repo: { claim: async () => null, fingerprint: async () => { calls.push('fingerprint'); return ''; },
      complete: async () => { calls.push('complete'); return ''; }, fail: async () => { calls.push('fail'); } },
    context: async () => { calls.push('context'); return buildHealthCoachContext({ asOf: '2026-10-14T12:00:00Z', data: {} }); },
    generate: async () => { calls.push('generate'); throw new Error('Unexpected'); },
  };
  assertEquals(await runPlanJob('unclaimed', deps), { status: 'not_claimed' });
  assertEquals(calls, []);
});

Deno.test('model failure is persisted before returning and never commits a partial plan', async () => {
  const calls: string[] = [];
  const context = buildHealthCoachContext({ asOf: '2026-10-14T12:00:00Z', data: {} });
  const result = await runPlanJob('job', { repo: {
    claim: async () => ({ id: 'job', user_id: 'owner', payload: {}, lease_token: 'lease', attempts: 3 }),
    fingerprint: async () => 'fingerprint', complete: async () => { calls.push('complete'); return ''; },
    fail: async (job, error) => { calls.push(`${job.lease_token}:${error}`); },
  }, context: async owner => { assertEquals(owner, 'owner'); return context; },
    generate: async () => { throw new Error('model timeout'); } });
  assertEquals(result.status, 'failed');
  assertEquals(calls, ['lease:model timeout']);
});
