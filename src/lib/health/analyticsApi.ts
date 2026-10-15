import {supabase,invokeEdge} from '../supabase';
import {ANALYTICS_DATASETS,chartDailySeries,validateAnalyticsQuery,type AnalyticsQuery,type HealthChartPreset} from '@vanguard/domain';

async function fetchAnalytics(userId:string,query:AnalyticsQuery) {
  validateAnalyticsQuery(query);
  const response=await invokeEdge('vanguard-oracle',{body:{action:'analytics',user_id:userId,query}});
  if(!response.analytics) throw new Error('Nie udało się pobrać danych wykresu.');
  return response.analytics;
}
export async function fetchChartData(userId:string,query:AnalyticsQuery,metric:string,aggregation:'mean'|'sum') {
  const [result,review]=await Promise.all([fetchAnalytics(userId,query),query.table === 'daily_nutrition'
    ?fetchAnalytics(userId,{table:'nutrition_day_reviews',columns:['date','completeness'],from:query.from,to:query.to}):Promise.resolve(null)]);
  const complete=new Set(review?.rows.filter(row=>row.completeness === 'complete').map(row=>String(row.date)) ?? []);
  return {points:chartDailySeries(result,metric,aggregation,complete),truncated:result.truncated || Boolean(review?.truncated)};
}
function readPreset(key:string,raw:string):HealthChartPreset|null {
  try {
    const value=JSON.parse(raw),source=ANALYTICS_DATASETS[value.table];
    if(!source || !Object.hasOwn(source.metrics,value.metric) || ![7,28,90,180].includes(value.days) || !['mean','sum'].includes(value.aggregation) || typeof value.name !== 'string' || !value.name.trim() || value.name.length>80) return null;
    return {key,name:value.name,table:value.table,metric:value.metric,days:value.days,aggregation:value.aggregation};
  } catch{return null;}
}
export async function fetchChartPresets(userId:string):Promise<HealthChartPreset[]> {
  const {data,error}=await supabase.from('vanguard_preferences').select('key,value').eq('user_id',userId).eq('is_active',true).like('key','health:chart:%').order('updated_at',{ascending:false}).limit(20);
  if(error) throw error;
  return (data ?? []).flatMap(row=>{const preset=readPreset(row.key,row.value);return preset?[preset]:[];});
}
export async function saveChartPreset(userId:string,preset:HealthChartPreset) {
  if(!/^health:chart:[\da-f-]{36}$/i.test(preset.key) || !readPreset(preset.key,JSON.stringify(preset))) throw new Error('Nieprawidłowy zapis wykresu.');
  const {error}=await supabase.from('vanguard_preferences').upsert({user_id:userId,key:preset.key,value:JSON.stringify(preset),is_active:true,updated_at:new Date().toISOString()},{onConflict:'user_id,key'});
  if(error) throw error;
}
export async function removeChartPreset(userId:string,key:string) {
  const {error}=await supabase.from('vanguard_preferences').update({is_active:false}).eq('user_id',userId).eq('key',key);
  if(error) throw error;
}
