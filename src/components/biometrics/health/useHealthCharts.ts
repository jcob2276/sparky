import {useState} from 'react';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {ANALYTICS_DATASETS,getTodayWarsaw,shiftDateStr,type HealthChartPreset} from '@vanguard/domain';
import {fetchChartData,fetchChartPresets,removeChartPreset,saveChartPreset} from '../../../lib/health/analyticsApi';
import {notify} from '../../../lib/notify';

export function useHealthCharts(userId:string) {
  const cache=useQueryClient(),today=getTodayWarsaw();
  const [selection,setSelection]=useState({table:'oura_daily_summary',metric:'hrv_avg',days:28,aggregation:'mean' as 'mean'|'sum',name:'Moje HRV'});
  const from=shiftDateStr(today,1-selection.days),source=ANALYTICS_DATASETS[selection.table];
  const presetsKey=['health-chart-presets',userId];
  const presets=useQuery({queryKey:presetsKey,queryFn:()=>fetchChartPresets(userId),enabled:Boolean(userId)});
  const chart=useQuery({queryKey:['health-chart',userId,selection.table,selection.metric,selection.days,selection.aggregation,today],
    queryFn:()=>fetchChartData(userId,{table:selection.table,columns:[source.date!,selection.metric],from,to:today},selection.metric,selection.aggregation),enabled:Boolean(userId)});
  const save=useMutation({mutationFn:()=>saveChartPreset(userId,{...selection,key:`health:chart:${crypto.randomUUID()}`}),onSuccess:()=>{void cache.invalidateQueries({queryKey:presetsKey});notify('Zapisano wykres.','success');},onError:(error:Error)=>notify(error.message,'error')});
  const remove=useMutation({mutationFn:(key:string)=>removeChartPreset(userId,key),onSuccess:()=>{void cache.invalidateQueries({queryKey:presetsKey});},onError:(error:Error)=>notify(error.message,'error')});
  return {selection,from,to:today,points:chart.data?.points ?? [],truncated:chart.data?.truncated ?? false,
    loading:chart.isLoading,error:chart.error?.message ?? null,presetsError:presets.error?.message ?? null,presets:presets.data ?? [],busy:save.isPending || remove.isPending,
    onTable:(table:string)=>{const metric=Object.keys(ANALYTICS_DATASETS[table].metrics)[0];setSelection({...selection,table,metric,name:ANALYTICS_DATASETS[table].metrics[metric]});},
    onMetric:(metric:string)=>setSelection({...selection,metric,name:source.metrics[metric]}),
    onDays:(days:number)=>setSelection({...selection,days}),onAggregation:(aggregation:'mean'|'sum')=>setSelection({...selection,aggregation}),
    onName:(name:string)=>setSelection({...selection,name}),onLoad:(preset:HealthChartPreset)=>setSelection(preset),onSave:()=>save.mutate(),onRemove:(key:string)=>remove.mutate(key),onRetry:()=>{void chart.refetch();}};
}
