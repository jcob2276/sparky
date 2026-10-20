import {invokeEdge} from '../supabase';
import {chartDailySeries,validateAnalyticsQuery,type AnalyticsQuery} from '@vanguard/domain';

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
