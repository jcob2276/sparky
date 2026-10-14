import type {SupabaseClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {ANALYTICS_DATASETS,validateAnalyticsQuery,warsawDayBoundsISO,shiftDateStr,type AnalyticsResult} from '@vanguard/domain';
import {logAuditEvent} from './audit.ts';

/** Legacy module name; only structured reads are supported. No raw SQL is executed. */
export async function runOracleReadonlyQuery(supabase:SupabaseClient,userId:string,input:unknown):Promise<
  ({ok:true}&AnalyticsResult)|{ok:false;error:string}
> {
  try {
    if(!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(userId)) throw new Error('Brak uwierzytelnionego właściciela.');
    const request=validateAnalyticsQuery(input),source=ANALYTICS_DATASETS[request.table];
    const columns=request.columns.map(column=>column === 'exercise_logs'?'exercise_logs(exercise_name,set_number,reps,weight,rpe,rir)':column).join(',');
    let query=supabase.from(request.table).select(columns).eq('user_id',userId);
    if(request.table === 'strava_activities_clean') query=query.eq('is_oura',false);
    if(source.date) {
      const isDate=['date','week_start','month_start','result_date','document_date'].includes(source.date);
      query=query.gte(source.date,isDate?request.from:warsawDayBoundsISO(request.from).fromISO);
      query=(isDate?query.lte(source.date,request.to):query.lt(source.date,warsawDayBoundsISO(shiftDateStr(request.to,1)).fromISO)).order(source.date);
    }
    for(const filter of request.filters ?? []) {
      if(filter.op === 'eq') query=query.eq(filter.field,filter.value);
      if(filter.op === 'gte') query=query.gte(filter.field,filter.value);
      if(filter.op === 'lte') query=query.lte(filter.field,filter.value);
      if(filter.op === 'ilike') query=query.ilike(filter.field,String(filter.value));
    }
    const {data,error}=await query.limit(201);
    if(error) return {ok:false,error:error.message};
    const rows:unknown=data;
    if(!Array.isArray(rows)) return {ok:false,error:'Nieprawidłowa odpowiedź źródła danych.'};
    if(JSON.stringify(rows).length>100000) return {ok:false,error:'Zbyt dużo treści. Wybierz mniej pól lub krótszy okres.'};
    const result:AnalyticsResult={rows:rows.slice(0,200) as Record<string,unknown>[],table:request.table,from:request.from,to:request.to,truncated:rows.length>200};
    await logAuditEvent({eventType:'oracle_data_tool_call',severity:'info',message:'Owner-scoped read',userId,
      metadata:{table:request.table,columns:request.columns,from:request.from,to:request.to,truncated:result.truncated,rowCount:result.rows.length}});
    return {ok:true,...result};
  } catch(error) {return {ok:false,error:error instanceof Error?error.message:'Źródło niedostępne.'};}
}
