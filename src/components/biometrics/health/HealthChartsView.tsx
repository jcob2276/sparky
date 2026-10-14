import {CartesianGrid,Line,LineChart,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {ANALYTICS_DATASETS,type HealthChartPoint,type HealthChartPreset} from '@vanguard/domain';
import {ControlInput,ControlSelect} from '../../ui/ControlPrimitives';
import Button from '../../ui/Button';
interface Props {
  selection:Omit<HealthChartPreset,'key'>;from:string;to:string;points:HealthChartPoint[];truncated:boolean;loading:boolean;error:string|null;presetsError:string|null;presets:HealthChartPreset[];busy:boolean;
  onTable:(value:string)=>void;onMetric:(value:string)=>void;onDays:(value:number)=>void;onAggregation:(value:'mean'|'sum')=>void;onName:(value:string)=>void;
  onLoad:(preset:HealthChartPreset)=>void;onSave:()=>void;onRemove:(key:string)=>void;onRetry:()=>void;
}
export function HealthChartsView(props:Props) {
  const {selection,points}=props,source=ANALYTICS_DATASETS[selection.table],observed=points.filter(row=>row.value != null).length;
  return <section className="space-y-4 rounded-2xl border border-border-custom/40 bg-surface-1 p-4">
    <h3 className="text-lg text-text-primary">Własne wykresy zdrowia</h3>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-xs text-text-secondary">Źródło<ControlSelect className="mt-1 w-full" value={selection.table} onChange={event=>props.onTable(event.target.value)}>
        {Object.entries(ANALYTICS_DATASETS).filter(([,value])=>Object.keys(value.metrics).length).map(([key,value])=><option key={key} value={key}>{value.label}</option>)}
      </ControlSelect></label>
      <label className="text-xs text-text-secondary">Metryka<ControlSelect className="mt-1 w-full" value={selection.metric} onChange={event=>props.onMetric(event.target.value)}>
        {Object.entries(source.metrics).map(([key,label])=><option key={key} value={key}>{label}</option>)}
      </ControlSelect></label>
      <label className="text-xs text-text-secondary">Okres<ControlSelect className="mt-1 w-full" value={selection.days} onChange={event=>props.onDays(Number(event.target.value))}>
        {[7,28,90,180].map(days=><option key={days} value={days}>{days} dni</option>)}
      </ControlSelect></label>
      <label className="text-xs text-text-secondary">Dane w obrębie dnia<ControlSelect className="mt-1 w-full" value={selection.aggregation} onChange={event=>props.onAggregation(event.target.value as 'mean'|'sum')}>
        <option value="mean">Średnia z zapisów</option><option value="sum">Suma zapisów</option>
      </ControlSelect></label>
    </div>
    <p className="text-xs text-text-muted">{props.from} – {props.to} · Europe/Warsaw · dni z pomiarem: {observed}/{points.length || selection.days}. Braki pozostają przerwami.</p>
    {selection.table === 'daily_nutrition' && <p className="text-xs text-text-muted">Tylko dni oznaczone przez Ciebie jako kompletne. Pozostałe wpisy nie określają pełnego spożycia.</p>}
    {props.loading?<p className="text-sm text-text-muted">Wczytuję pomiary…</p>:props.error?<div role="alert"><p>{props.error}</p><Button onClick={props.onRetry}>Ponów odczyt</Button></div>:observed === 0?<p className="text-sm text-text-muted">Brak pomiarów w wybranym okresie.</p>:<div className="h-52" role="img" aria-label={`Wykres: ${source.metrics[selection.metric]}`}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}><LineChart data={points}>
        <CartesianGrid stroke="var(--border-custom)" vertical={false}/><XAxis dataKey="date" minTickGap={30}/><YAxis width={45}/><Tooltip/>
        <Line type="linear" dataKey="value" name={source.metrics[selection.metric]} stroke="var(--color-primary)" connectNulls={false} isAnimationActive={false}/>
      </LineChart></ResponsiveContainer>
    </div>}
    {props.truncated && <p role="status" className="text-xs text-warning">Źródło przekroczyło limit 200 rekordów. Wykres jest niepełny — skróć okres przed wyciąganiem wniosków.</p>}
    <div className="flex gap-2"><label className="flex-1 text-xs">Nazwa wykresu<ControlInput className="w-full" maxLength={80} value={selection.name} onChange={event=>props.onName(event.target.value)}/></label><Button disabled={props.busy || !selection.name.trim()} onClick={props.onSave}>Zapisz wykres</Button></div>
    {props.presetsError && <p role="alert" className="text-xs text-danger">Nie udało się odczytać zapisanych wykresów.</p>}
    {props.presets.length>0 && <ul className="space-y-2">{props.presets.map(preset=><li key={preset.key} className="flex justify-between gap-2"><Button variant="ghost" onClick={()=>props.onLoad(preset)}>{preset.name}</Button><Button variant="ghost" disabled={props.busy} onClick={()=>props.onRemove(preset.key)}>Usuń zapis</Button></li>)}</ul>}
    <p className="text-xs text-text-muted">Wykres opisuje zapisane dane. Wspólna zmiana dwóch metryk nie dowodzi przyczyny; znaczenie mogą mieć trening, choroba, podróż i zmiany rejestrowania.</p>
  </section>;
}
