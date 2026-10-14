import {assertEquals,assertRejects} from 'https://deno.land/std@0.208.0/assert/mod.ts';
import {runDailyReconciliation} from './daily.ts';
import {runWeeklySynthesis} from './weekly-synthesis.ts';
Deno.test('configured-owner Telegram recaps reject another signed-in user before database or outbound work',async()=>{
  const settings={SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-service-key',SB_SECRET_KEY:'',VANGUARD_USER_ID:'11111111-1111-4111-8111-111111111111',TELEGRAM_CHAT_ID:'123'};
  const prior=new Map(Object.keys(settings).map(key=>[key,Deno.env.get(key)])),oldFetch=globalThis.fetch;
  for(const [key,value] of Object.entries(settings)) Deno.env.set(key,value);
  let reads=0;
  globalThis.fetch=async input=>{
    const url=new URL(input instanceof Request?input.url:String(input));
    if(url.pathname === '/auth/v1/user') return Response.json({id:'22222222-2222-4222-8222-222222222222'});
    reads++;return Response.json([]);
  };
  try {
    for(const run of [runDailyReconciliation,runWeeklySynthesis]) {
      const req=new Request('https://example.supabase.co/functions/v1/recap',{method:'POST',headers:{Authorization:'Bearer user-token'}});
      await assertRejects(()=>run(req),Error,'Forbidden userId mismatch');
    }
    assertEquals(reads,0);
  } finally {
    globalThis.fetch=oldFetch;
    for(const [key,value] of prior) if(value == null) Deno.env.delete(key);else Deno.env.set(key,value);
  }
});
