import {assertEquals} from 'https://deno.land/std@0.208.0/assert/mod.ts';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {runOracleReadonlyQuery} from './oracleSql.ts';

Deno.test('Oracle rejects free-form SQL before any privileged database call',async()=>{
  const previous={url:Deno.env.get('SUPABASE_URL'),key:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')};
  Deno.env.set('SUPABASE_URL','https://example.supabase.co');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY','test-key');
  const oldFetch=globalThis.fetch;
  globalThis.fetch=()=>Promise.resolve(Response.json([]));
  let calls=0;
  const client=createClient('https://example.supabase.co','test-key',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:()=>{calls++;return Promise.resolve(Response.json([{user_id:'other-owner'}]));}}});
  try {
    const result=await runOracleReadonlyQuery(client,'11111111-1111-4111-8111-111111111111','SELECT * FROM public.daily_nutrition');
    assertEquals(result.ok,false);
    assertEquals(calls,0);
  } finally {
    globalThis.fetch=oldFetch;
    for(const [key,value] of [['SUPABASE_URL',previous.url],['SUPABASE_SERVICE_ROLE_KEY',previous.key]]) {
      if(value == null) Deno.env.delete(key!); else Deno.env.set(key!,value);
    }
  }
});

Deno.test('structured reads enforce owner and Warsaw window, reject injected identifiers and expose truncation',async()=>{
  const priorUrl=Deno.env.get('SUPABASE_URL'),priorKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),oldFetch=globalThis.fetch;
  Deno.env.set('SUPABASE_URL','https://example.supabase.co');Deno.env.set('SUPABASE_SERVICE_ROLE_KEY','test-key');
  globalThis.fetch=()=>Promise.resolve(Response.json([]));
  const owner='11111111-1111-4111-8111-111111111111';let calls=0;
  const client=createClient('https://example.supabase.co','test-key',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input)=>{
    calls++;const url=new URL(input instanceof Request?input.url:String(input));
    assertEquals(url.pathname,'/rest/v1/strava_activities_clean');
    assertEquals(url.searchParams.get('user_id'),`eq.${owner}`);
    assertEquals(url.searchParams.get('select'),'start_date,distance');
    assertEquals(url.searchParams.get('is_oura'),'eq.false');
    assertEquals(url.searchParams.get('limit'),'201');
    assertEquals(url.searchParams.getAll('start_date'),['gte.2026-10-14T00:00:00+02:00','lt.2026-10-15T00:00:00+02:00']);
    return Promise.resolve(Response.json(Array.from({length:201},()=>({start_date:'2026-10-14T05:00:00Z',distance:0}))));
  }}});
  const input={table:'strava_activities_clean',columns:['start_date','distance'],from:'2026-10-14',to:'2026-10-14'};
  try {
    const result=await runOracleReadonlyQuery(client,owner,input);
    assertEquals(result.ok,true);
    if(result.ok){assertEquals(result.rows.length,200);assertEquals(result.truncated,true);assertEquals(result.rows[0].distance,0);}
    for(const invalid of [
      {...input,table:'auth.users'}, {...input,columns:['*,users(*)']}, {...input,columns:['user_id']},
      {...input,filters:[{field:'user_id',op:'eq',value:'other'}]},
      {...input,filters:[{field:'distance',op:'or',value:'user_id.eq.other'}]},
      {...input,from:'2026-02-30'}, {...input,to:'2028-10-14'},
    ]) assertEquals((await runOracleReadonlyQuery(client,owner,invalid)).ok,false);
    assertEquals(calls,1);
  } finally {
    globalThis.fetch=oldFetch;
    if(priorUrl == null) Deno.env.delete('SUPABASE_URL');else Deno.env.set('SUPABASE_URL',priorUrl);
    if(priorKey == null) Deno.env.delete('SUPABASE_SERVICE_ROLE_KEY');else Deno.env.set('SUPABASE_SERVICE_ROLE_KEY',priorKey);
  }
});
