import {expect,it,vi} from 'vitest';
import {getTodayWarsaw} from '../date';
import {invokeEdge} from '../supabase';
import {fetchNutritionDayContext} from './nutritionContext';
vi.mock('../supabase',()=>({invokeEdge:vi.fn(async()=>({success:true})),supabase:{from:()=>{
  const query={select:()=>query,eq:()=>query,gte:()=>query,lte:()=>query,lt:()=>query,order:()=>query,limit:()=>query,
    maybeSingle:async()=>({data:null,error:null}),then:(resolve:(value:unknown)=>unknown)=>Promise.resolve({data:[],error:null}).then(resolve)};return query;
}}}));
it('initializes a missing current goal through deterministic refresh without a separate access token or model request',async()=>{
  const today=getTodayWarsaw();
  const result=await fetchNutritionDayContext('owner-one',today);
  expect(invokeEdge).toHaveBeenCalledWith('vanguard-nutrition-coach',expect.objectContaining({body:{action:'refresh_targets',userId:'owner-one',date:today,notify:false}}));
  expect(result.targetKcal).toBeNull();
});
