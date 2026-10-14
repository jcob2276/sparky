import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { formatWarsawDate } from '@vanguard/domain';
import { trainingCommandReply } from './trainingPlan.ts';

Deno.test('Telegram reads the same recovery decision and queues an idempotent draft without activating it', async () => {
  const owner = '11111111-1111-4111-8111-111111111111', today = formatWarsawDate(new Date());
  const calls: Array<{ path: string; body: unknown }> = [];
  const client = createClient('https://example.supabase.co', 'test-key', {
    auth: { persistSession:false,autoRefreshToken:false,detectSessionInUrl:false },
    global: { fetch: async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      if (url.pathname.includes('/rpc/')) {
        calls.push({path:url.pathname,body:JSON.parse(String(init?.body))});
        return Response.json('test-job');
      }
      assertEquals(url.searchParams.get('user_id'),`eq.${owner}`);
      const source = url.pathname.split('/').pop();
      const rows = source === 'vanguard_preferences' ? [{key:'health_coach:constraints',value:JSON.stringify({revision:1,availability:[{day:3,minutes:60}],equipment:['barbell'],limitations:[]})}]
        : source === 'goal_kpis' ? [{id:'goal',measurement_spec:{kind:'bench'}}]
        : source === 'oura_daily_summary' ? [{date:today,total_sleep_hours:5,readiness_score:50}]
        : source === 'training_plan_workouts' ? [{id:'plan',planned_date:today,completed:false,prescription:{key:'s1',date:today,name:'Siła',type:'strength',goal:'Bench',durationMinutes:45,warmupMinutes:5,cooldownMinutes:5,intensity:'hard',notes:'RIR 2',exercises:[{name:'Bench Press',sets:4,reps:8,rir:2,restSeconds:120,weightKg:null,equipment:['barbell'],pattern:'upper'}]}}]
        : [];
      return Response.json(rows);
    } },
  });
  const ctx = {supabase:client,vanguardUserId:owner,messageId:123};
  const reply = await trainingCommandReply(ctx,'/trening');
  assertStringIncludes(reply,'mniejszą objętość');
  assertEquals(calls.length,0,'reading the decision must not mutate the plan');
  await trainingCommandReply(ctx,'/trening plan');
  assertEquals(calls,[{path:'/rest/v1/rpc/enqueue_health_coach_job',body:{p_owner:owner,p_request_key:'telegram:training:123',p_payload:{kind:'generate',weeks:4}}}]);
});
