import {assertEquals,assertStringIncludes} from 'https://deno.land/std@0.208.0/assert/mod.ts';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {loadUserContext} from './userContext.ts';
Deno.test('food planning uses current dated targets, the real weight column, confirmed preferences and Warsaw winter hours',async()=>{
  const urls:URL[]=[],owner='11111111-1111-4111-8111-111111111111';
  const client=createClient('https://example.supabase.co','test',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input)=>{
    const url=new URL(input instanceof Request?input.url:String(input)),table=url.pathname.split('/').at(-1);urls.push(url);
    assertEquals(url.searchParams.get('user_id'),`eq.${owner}`);
    const rows=table === 'body_metrics'?[{weight:80,date:'2026-12-14'}]:table === 'nutrition_targets'?[{target_kcal:2400,protein_floor_g:160}]
      :table === 'vanguard_preferences'?[{value:JSON.stringify({revision:2,confirmed:true,maxPrepMinutes:30,excluded:['oliwa'],allergies:['mleko'],preferences:'',pattern:'any'})}]
      :table === 'daily_food_entries'?[{name:'Jajko',logged_at:'2026-12-14T10:30:00Z'}]:[];
    return Response.json(rows);
  }}});
  const {ctx}=await loadUserContext(owner,client,'morning',new Date('2026-12-15T12:00:00Z'));
  assertStringIncludes(ctx.profileLine,'80 kg');assertStringIncludes(ctx.historyBlock,'Jajko');
  assertEquals(ctx.mealPreferences?.allergies,['mleko']);
  assertEquals(urls.find(url=>url.pathname.endsWith('nutrition_targets'))?.searchParams.get('date'),'lte.2026-12-15');
  assertEquals(urls.find(url=>url.pathname.endsWith('body_metrics'))?.searchParams.get('select'),'weight,date');
});
