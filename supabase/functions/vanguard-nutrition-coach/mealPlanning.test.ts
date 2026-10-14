import {assertEquals,assertStringIncludes} from 'https://deno.land/std@0.208.0/assert/mod.ts';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {generateMealPlan} from './mealPlanning.ts';
import {shiftDateStr,type MealPlanState} from '@vanguard/domain';
const owner='11111111-1111-4111-8111-111111111111',date='2026-10-14';
const recipe={notes:'Ugotuj',days:[{date,meals:[{key:'m1',name:'Owsianka',prepMinutes:10,instructions:'Ugotuj płatki.',ingredients:[{productId:'oats',grams:100}]}]}]};
function fixture(catalog=true,confirmed=true) {
  let state:MealPlanState|null=null,exists=false,writes=0;
  let preferences={revision:1,confirmed,maxPrepMinutes:30,excluded:[],allergies:[],preferences:'Na ciepło',pattern:'any'};
  const client=createClient('https://example.supabase.co','test-key',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:async(input,init)=>{
    const url=new URL(input instanceof Request?input.url:String(input)),table=url.pathname.split('/').at(-1),method=init?.method ?? 'GET';
    if(table === 'vanguard_preferences') {assertEquals(url.searchParams.get('user_id'),`eq.${owner}`);assertEquals(url.searchParams.get('key'),'eq.health_coach:meal_preferences');return Response.json([{value:JSON.stringify(preferences)}]);}
    if (table === 'food_reference_pl') return Response.json(catalog?[{id:'oats',name:'Płatki',calories:400,protein:10,carbs:60,fat:10,fiber:8}]:[]);
    if (table === 'food_library') {assertEquals(url.searchParams.get('user_id'),`eq.${owner}`);return Response.json([]);}
    assertEquals(table,'nutrition_targets');
    if (method === 'POST') {const body=JSON.parse(String(init?.body));assertEquals(body,{user_id:owner,date});exists=true;return Response.json([]);}
    assertEquals(url.searchParams.get('user_id'),`eq.${owner}`);assertEquals(url.searchParams.get('date'),`eq.${date}`);
    if (method === 'PATCH') {
      const guard=url.searchParams.get('meal_plan'),matches=guard === 'is.null'?state == null:guard === `cs.${JSON.stringify({revision:state?.revision})}`;
      if (!exists || !matches) return Response.json([]);
      state=JSON.parse(String(init?.body)).meal_plan;writes++;return Response.json([{meal_plan:state}]);
    }
    return Response.json(exists?[{meal_plan:state}]:[]);
  }}});
  return {client,get state(){return state;},get writes(){return writes;},concurrentChange:()=>{state=state?{...state,revision:state.revision+1}:null;},changePreferences:()=>{preferences={...preferences,revision:preferences.revision+1};}};
}
Deno.test('meal generation persists a missing target row, checks CAS and replays the same request without regenerating',async()=>{
  const db=fixture();let modelCalls=0;
  const propose=async()=>{modelCalls++;return {content:JSON.stringify(recipe),raw:{}};};
  const input={date,requestKey:'request-one',targets:[{date,calories:400,protein:10}]};
  const first=await generateMealPlan({supabase:db.client,userId:owner,apiKey:'test-key',input,propose});
  assertEquals(first.success,true);assertEquals(db.state?.revision,1);assertEquals(db.writes,1);
  assertEquals(first.state?.draft?.preferencesRevision,1);
  const replay=await generateMealPlan({supabase:db.client,userId:owner,apiKey:'test-key',input,propose});
  assertEquals(replay.state?.revision,1);assertEquals(modelCalls,1);assertEquals(db.writes,1);
  const conflict=await generateMealPlan({supabase:db.client,userId:owner,apiKey:'test-key',input:{...input,requestKey:'request-two'},propose:async()=>{db.concurrentChange();return {content:JSON.stringify(recipe),raw:{}};}});
  assertEquals(conflict.success,false);assertStringIncludes(conflict.errors.join(' '),'zmienił się');assertEquals(db.state?.revision,2);assertEquals(db.writes,1);
});
Deno.test('generation requires confirmed saved preferences and discards a proposal if they change during model work',async()=>{
  const input={date,requestKey:'preferences-check',targets:[{date,calories:400,protein:10}]};
  const missing=fixture(true,false);let calls=0;
  const propose=async()=>{calls++;return {content:JSON.stringify(recipe),raw:{}};};
  assertEquals((await generateMealPlan({supabase:missing.client,userId:owner,apiKey:'test',input,propose})).success,false);
  assertEquals(calls,0);
  const db=fixture();
  const result=await generateMealPlan({supabase:db.client,userId:owner,apiKey:'test',input,propose:async()=>{db.changePreferences();return {content:JSON.stringify(recipe),raw:{}};}});
  assertEquals(result.success,false);assertEquals(db.writes,0);
});
Deno.test('model and catalog failures preserve the active state rather than fabricating a generic recipe',async()=>{
  const input={date,requestKey:'request-failed',targets:[{date,calories:400,protein:10}]};
  const empty=fixture(false);
  const absent=await generateMealPlan({supabase:empty.client,userId:owner,apiKey:'',input});
  assertEquals(absent.success,false);assertStringIncludes(absent.errors.join(' '),'Brak produktów');assertEquals(empty.writes,0);
  const db=fixture();
  const failure=await generateMealPlan({supabase:db.client,userId:owner,apiKey:'',input});
  assertEquals(failure.success,false);assertEquals(db.writes,0);
});
Deno.test('a weekly proposal persists every requested date and refuses a missing day',async()=>{
  const db=fixture(),targets=Array.from({length:7},(_,index)=>({date:shiftDateStr(date,index),calories:400,protein:10}));
  const weekly={templates:{oats:recipe.days[0].meals[0]},days:targets.map(day=>({date:day.date,meals:[{key:'breakfast',template:'oats'}]}))};
  const input={date,requestKey:'week-one',targets};
  const result=await generateMealPlan({supabase:db.client,userId:owner,apiKey:'test',input,propose:async()=>({content:JSON.stringify(weekly),raw:{}})});
  assertEquals(result.success,true);assertEquals(result.state?.draft?.days.length,7);assertEquals(result.state?.active,null);
  assertEquals(db.writes,1);
  const missing=await generateMealPlan({supabase:db.client,userId:owner,apiKey:'test',input:{...input,requestKey:'week-two'},propose:async()=>({content:JSON.stringify({...weekly,days:weekly.days.slice(0,6)}),raw:{}})});
  assertEquals(missing.success,false);assertEquals(db.writes,1);assertEquals(db.state?.draft?.days.length,7);
});
