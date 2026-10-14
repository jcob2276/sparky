import {formatWarsawDate,shiftDateStr} from '../date.ts';
/** The model chooses from these fields; it never supplies SQL or an owner. */
export const ANALYTICS_DATASETS:Record<string,{label:string;date:string|null;columns:string[];metrics:Record<string,string>}>={
  oura_daily_summary:{label:'Sen i regeneracja',date:'date',columns:['date','readiness_score','sleep_score','total_sleep_hours','hrv_avg','rhr_avg','steps','stress_score'],metrics:{total_sleep_hours:'Sen (h)',hrv_avg:'HRV (ms)',rhr_avg:'Tętno spoczynkowe',readiness_score:'Gotowość',sleep_score:'Wynik snu',steps:'Kroki',stress_score:'Stres'}},
  daily_nutrition:{label:'Żywienie',date:'date',columns:['date','calories','protein','carbs','fat','fiber','sugar','avg_food_quality'],metrics:{calories:'Energia (kcal)',protein:'Białko (g)',carbs:'Węglowodany (g)',fat:'Tłuszcze (g)',fiber:'Błonnik (g)'}},
  body_metrics:{label:'Pomiary ciała',date:'date',columns:['date','weight','waist','body_fat','chest','thigh','calf','muscle_mass'],metrics:{weight:'Masa (kg)',waist:'Talia (cm)',body_fat:'Tkanka tłuszczowa (%)'}},
  daily_strain:{label:'Obciążenie',date:'date',columns:['date','strain_score','recovery_score','daily_status','main_limiter','illness_level','cardio_load','strength_load','leg_load','cns_load'],metrics:{strain_score:'Obciążenie',recovery_score:'Regeneracja',cardio_load:'Obciążenie cardio',strength_load:'Obciążenie siłowe'}},
  strava_activities_clean:{label:'Garmin przez Intervals.icu',date:'start_date',columns:['start_date','name','sport_type','distance','moving_time','elapsed_time','hr_avg','trimp','source','gc_weather'],metrics:{distance:'Dystans (m)',elapsed_time:'Pełny czas (s)',hr_avg:'Średnie tętno',trimp:'TRIMP'}},
  workout_sessions:{label:'Sesje siłowe',date:'date',columns:['date','workout_day','duration_minutes','session_rpe','session_notes','exercise_logs'],metrics:{duration_minutes:'Czas (min)',session_rpe:'RPE sesji'}},
  daily_food_entries:{label:'Wpisy jedzenia',date:'date',columns:['date','name','calories','protein','carbs','fat','fiber','meal_type','food_quality_score'],metrics:{}},
  nutrition_day_reviews:{label:'Kompletność dziennika',date:'date',columns:['date','completeness','confirmed_at'],metrics:{}},
  nutrition_targets:{label:'Cele żywienia',date:'date',columns:['date','target_kcal','protein_floor_g','deficit_kcal','est_maintenance_kcal'],metrics:{}},
  nutrition_profile:{label:'Profil żywienia',date:null,columns:['height_cm','birth_date','sex','goal_body_fat','event_date','event_name','protein_g_per_kg'],metrics:{}},
  goal_kpis:{label:'Cele',date:null,columns:['id','name','unit','target','measurement_spec','revision'],metrics:{}},
  kpi_entries:{label:'Wpisy celów',date:'week_start',columns:['kpi_id','week_start','value'],metrics:{}},
  medical_lab_results:{label:'Wyniki badań',date:'result_date',columns:['result_date','marker_key','marker_name','value','unit','ref_low','ref_high','flag'],metrics:{}},
  medical_documents:{label:'Dokumenty medyczne',date:'document_date',columns:['document_date','document_type','summary'],metrics:{}},
  body_composition_measurements:{label:'Skład ciała',date:'measured_at',columns:['measured_at','weight_kg','body_fat_pct','muscle_mass_kg','bmr_kcal'],metrics:{}},
  phone_usage_daily:{label:'Telefon',date:'date',columns:['date','total_minutes','late_night_minutes','social_minutes','unlocks'],metrics:{total_minutes:'Telefon (min)',late_night_minutes:'Telefon w nocy (min)'}},
  vanguard_calendar:{label:'Kalendarz',date:'start_time',columns:['summary','start_time','end_time','category'],metrics:{}},
  vanguard_stream:{label:'Zgłoszenia',date:'timestamp',columns:['source','content','category','timestamp'],metrics:{}},
  todo_items:{label:'Zadania',date:null,columns:['id','title','notes','status','priority','due_date','completed_at','category','project_id'],metrics:{}},
  projects:{label:'Projekty',date:null,columns:['id','name','goal','status','deadline'],metrics:{}},
  weekly_reviews:{label:'Przeglądy tygodnia',date:'week_start',columns:['week_start','proud_of','sabotage','do_differently','week_sentiment','bottleneck'],metrics:{}},
  monthly_reviews:{label:'Przeglądy miesiąca',date:'month_start',columns:['month_start','pattern_note','leverage_note','month_theme'],metrics:{}},
  daily_reconciliations:{label:'Refleksje dnia',date:'date',columns:['date','status','day_score','plan_quality','plan_failure_reason'],metrics:{}},
};
export interface AnalyticsQuery {
  table:string;columns:string[];from:string;to:string;
  filters?:Array<{field:string;op:'eq'|'gte'|'lte'|'ilike';value:string|number|boolean}>;
}
export interface AnalyticsResult {rows:Record<string,unknown>[];table:string;from:string;to:string;truncated:boolean}
export interface HealthChartPreset {key:string;name:string;table:string;metric:string;days:number;aggregation:'mean'|'sum'}
export interface HealthChartPoint {date:string;value:number|null;n:number}

export function chartDailySeries(result:AnalyticsResult,metric:string,aggregation:'mean'|'sum',completeDates?:Set<string>):HealthChartPoint[] {
  const source=ANALYTICS_DATASETS[result.table];
  validateAnalyticsQuery({table:result.table,columns:[source?.date,metric],from:result.from,to:result.to});
  const groups=new Map<string,number[]>();
  for(const row of result.rows) {
    const rawDate=row[source.date!],value=row[metric];
    if(typeof rawDate !== 'string' || typeof value !== 'number' || !Number.isFinite(value) || !Number.isFinite(Date.parse(rawDate))) continue;
    const date=rawDate.length === 10?rawDate:formatWarsawDate(rawDate);
    if(result.table === 'daily_nutrition' && !completeDates?.has(date)) continue;
    groups.set(date,[...groups.get(date) ?? [],value]);
  }
  const points:HealthChartPoint[]=[];
  for(let date=result.from;date<=result.to;date=shiftDateStr(date,1)) {
    const values=groups.get(date) ?? [],sum=values.reduce((a,b)=>a+b,0);
    points.push({date,value:values.length?aggregation === 'sum'?sum:sum/values.length:null,n:values.length});
  }
  return points;
}

export function validateAnalyticsQuery(raw:unknown):AnalyticsQuery {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Wybierz źródło, pola i okres zamiast SQL.');
  const row=raw as Record<string,unknown>,source=ANALYTICS_DATASETS[String(row.table)];
  if (!source || !Object.hasOwn(ANALYTICS_DATASETS,String(row.table))) throw new Error('Niedozwolone źródło danych.');
  const validDate=(value:unknown):value is string=>typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().startsWith(value);
  if (!validDate(row.from) || !validDate(row.to) || row.from>row.to || Date.parse(row.to)-Date.parse(row.from)>365*86400000) throw new Error('Wybierz poprawny okres do 366 dni.');
  if (!Array.isArray(row.columns) || !row.columns.length || row.columns.length>15 || row.columns.some(column=>typeof column !== 'string' || !source.columns.includes(column))) throw new Error('Niedozwolone pola danych.');
  const filters=row.filters ?? [];
  if (!Array.isArray(filters) || filters.length>5) throw new Error('Zbyt wiele filtrów.');
  for(const raw of filters) {
    if (!raw || typeof raw !== 'object') throw new Error('Nieprawidłowy filtr.');
    const filter=raw as Record<string,unknown>;
    if (!source.columns.includes(String(filter.field)) || filter.field === 'exercise_logs' || !['eq','gte','lte','ilike'].includes(String(filter.op))
      || !(typeof filter.value === 'string' && filter.value.length<=200 || typeof filter.value === 'number' && Number.isFinite(filter.value) || typeof filter.value === 'boolean')
      || filter.op === 'ilike' && typeof filter.value !== 'string') throw new Error('Niedozwolony filtr.');
  }
  return {table:String(row.table),columns:[...new Set(row.columns as string[])],from:row.from,to:row.to,filters:filters as AnalyticsQuery['filters']};
}
