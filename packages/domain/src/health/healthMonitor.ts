import { formatWarsawDate, shiftDateStr } from '../date.ts';
/**
 * @file healthMonitor.ts
 * @module @vanguard/domain/health/healthMonitor
 * @description Model monitora parametrów życiowych (Health Monitor) wzorowany na Bevel / Whoop:
 * porównuje bieżące wskaźniki (HRV, tętno spoczynkowe, oddech, temperaturę, natlenienie)
 * z 30-dniowym przedziałem bazowym użytkownika.
 */

export interface VitalBaseline {
  metricKey: 'hrv' | 'resting_hr' | 'breathing_rate' | 'skin_temp_dev' | 'spo2';
  name: string;
  unit: string;
  currentValue: number | null;
  formattedCurrent: string;
  baselineMin: number | null;
  baselineMax: number | null;
  baselineMean: number | null;
  formattedBaseline: string;
  status: 'optimal' | 'attention' | 'alert' | 'calibrating';
  statusLabel: string;
  daysOfHistory: number;
}

export interface HealthMonitorResult {
  vitals: VitalBaseline[];
  overallStatus: 'all_normal' | 'attention_needed' | 'calibrating';
  overallStatusLabel: string;
  daysAnalyzed: number;
}

export interface VitalHistoryRecord {
  date: string;
  hrv?: number | null;
  restingHr?: number | null;
  breathingRate?: number | null;
  skinTempDev?: number | null;
  spo2?: number | null;
}

type CurrentVitals = Omit<VitalHistoryRecord,'date'>;
const METRICS:Array<{key:VitalBaseline['metricKey'];field:keyof CurrentVitals;name:string;unit:string;digits:number}> = [
  {key:'hrv',field:'hrv',name:'HRV',unit:'ms',digits:0},
  {key:'resting_hr',field:'restingHr',name:'Tętno spoczynkowe',unit:'bpm',digits:0},
  {key:'breathing_rate',field:'breathingRate',name:'Częstotliwość oddechu',unit:'/min',digits:1},
  {key:'skin_temp_dev',field:'skinTempDev',name:'Odchylenie temperatury skóry',unit:'°C',digits:2},
  {key:'spo2',field:'spo2',name:'SpO₂',unit:'%',digits:0},
];
const validValue = (value:unknown,field:keyof CurrentVitals):value is number => typeof value === 'number' && Number.isFinite(value)
  && (field === 'skinTempDev' || value>0) && (field !== 'spo2' || value<=100);
function quantile(values:number[],fraction:number):number {
  const position=(values.length-1)*fraction,lower=Math.floor(position),upper=Math.ceil(position);
  return values[lower]+(values[upper]-values[lower])*(position-lower);
}
/** Descriptive personal history only: never a clinical reference range or diagnosis. */
export function evaluateHealthMonitor(current:CurrentVitals,history:VitalHistoryRecord[],asOfDate=formatWarsawDate(new Date())): HealthMonitorResult {
  const dated=[...new Map(history.filter(row=>/^\d{4}-\d{2}-\d{2}$/.test(row.date)
    && row.date<asOfDate && row.date>=shiftDateStr(asOfDate,-30)).map(row=>[row.date,row])).values()];
  const vitals:VitalBaseline[] = METRICS.map(metric=>{
    const values=dated.map(row=>row[metric.field]).filter((value):value is number=>validValue(value,metric.field)).sort((a,b)=>a-b);
    const observed=current[metric.field],value=validValue(observed,metric.field)?observed:null;
    const enough=values.length>=14;
    const min=enough?quantile(values,0.1):null,max=enough?quantile(values,0.9):null;
    const status:VitalBaseline['status']=!enough || value == null ? 'calibrating' : value<min! || value>max! ? 'attention' : 'optimal';
    return {metricKey:metric.key,name:metric.name,unit:metric.unit,currentValue:value,
      formattedCurrent:value == null?'Brak danych':`${value.toFixed(metric.digits)} ${metric.unit}`,
      baselineMin:min,baselineMax:max,baselineMean:enough?values.reduce((sum,item)=>sum+item,0)/values.length:null,
      formattedBaseline:min == null || max == null ? 'Potrzeba 14 wcześniejszych nocy' : `${min.toFixed(metric.digits)}–${max.toFixed(metric.digits)} ${metric.unit}`,
      status,statusLabel:status === 'calibrating' ? 'Brak danych lub kalibracja' : status === 'optimal' ? 'W przedziale historii' : 'Poza przedziałem historii',daysOfHistory:values.length};
  });
  const overallStatus:HealthMonitorResult['overallStatus']=vitals.some(row=>row.status === 'attention')?'attention_needed'
    : vitals.some(row=>row.status === 'calibrating')?'calibrating':'all_normal';
  return {vitals,overallStatus,overallStatusLabel:overallStatus === 'attention_needed'?'Odczyty odbiegają od historii'
    : overallStatus === 'calibrating'?'Część danych wymaga uzupełnienia':'Dostępne odczyty w przedziale historii',daysAnalyzed:dated.length};
}
