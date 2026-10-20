import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ANALYTICS_DATASETS, getTodayWarsaw, shiftDateStr } from '@vanguard/domain';
import { fetchChartData } from '../../../lib/health/analyticsApi';

/** Źródła pokazywane w „Własnych wykresach zdrowia” — tylko zdrowie, bez żywienia. */
export const HEALTH_CHART_TABLES = [
  'oura_daily_summary', 'daily_strain', 'strava_activities_clean', 'phone_usage_daily', 'body_metrics',
] as const;

export interface ChartSelection {
  table: string;
  metric: string;
  days: number;
  aggregation: 'mean' | 'sum';
}

const DEFAULT_SELECTION: ChartSelection = {
  table: 'oura_daily_summary', metric: 'hrv_avg', days: 28, aggregation: 'mean',
};

/** Wykresy tylko do odczytu: wybór źródła/metryki/okresu, bez zapisywania własnych presetów. */
export function useHealthCharts(userId: string) {
  const today = getTodayWarsaw();
  const [selection, setSelection] = useState<ChartSelection>(DEFAULT_SELECTION);
  const from = shiftDateStr(today, 1 - selection.days);
  const source = ANALYTICS_DATASETS[selection.table];
  const chart = useQuery({
    queryKey: ['health-chart', userId, selection.table, selection.metric, selection.days, selection.aggregation, today],
    queryFn: () => fetchChartData(
      userId,
      { table: selection.table, columns: [source.date!, selection.metric], from, to: today },
      selection.metric,
      selection.aggregation,
    ),
    enabled: Boolean(userId),
  });
  return {
    selection,
    from,
    to: today,
    points: chart.data?.points ?? [],
    truncated: chart.data?.truncated ?? false,
    loading: chart.isLoading,
    error: chart.error?.message ?? null,
    onTable: (table: string) => setSelection({
      ...selection, table, metric: Object.keys(ANALYTICS_DATASETS[table].metrics)[0],
    }),
    onMetric: (metric: string) => setSelection({ ...selection, metric }),
    onDays: (days: number) => setSelection({ ...selection, days }),
    onAggregation: (aggregation: 'mean' | 'sum') => setSelection({ ...selection, aggregation }),
    onRetry: () => { void chart.refetch(); },
  };
}
