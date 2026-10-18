import { shiftDateStr } from '../date';

interface SummaryDay {
  date: string;
  sleep_score?: number | null;
  readiness_score?: number | null;
  hrv_avg?: number | null;
}
interface EnhancedDay extends SummaryDay { sleep_average_hrv?: number | null }
interface DirectionInput { asOf: string; summaries?: SummaryDay[]; enhanced?: EnhancedDay[] }

function measured(value: number | null | undefined, score = false): number | null {
  return value != null && Number.isFinite(value) && (score ? value >= 0 && value <= 100 : value > 0)
    ? value : null;
}

function mean(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export function buildHealthDirection({ asOf, summaries = [], enhanced = [] }: DirectionInput) {
  const currentStart = shiftDateStr(asOf, -6);
  const previousStart = shiftDateStr(asOf, -13);
  const previousEnd = shiftDateStr(asOf, -7);
  // One record per source and day; callers append the refreshed daily row last.
  const summaryDays = new Map(summaries.map(day => [day.date, day]));
  const enhancedDays = new Map(enhanced.map(day => [day.date, day]));
  const dates = [...new Set([...summaryDays.keys(), ...enhancedDays.keys()])]
    .filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= previousStart && date <= asOf)
    .sort();
  const days = dates.map(date => {
    const summary = summaryDays.get(date);
    const detail = enhancedDays.get(date);
    return {
      date,
      sleep: measured(summary?.sleep_score, true) ?? measured(detail?.sleep_score, true),
      recovery: measured(summary?.readiness_score, true) ?? measured(detail?.readiness_score, true),
      hrv: measured(detail?.sleep_average_hrv) ?? measured(summary?.hrv_avg),
    };
  });
  const metrics = ([
    { key: 'sleep', label: 'Wynik snu', unit: 'pkt' },
    { key: 'recovery', label: 'Regeneracja', unit: 'pkt' },
    { key: 'hrv', label: 'Nocne HRV', unit: 'ms' },
  ] as const).map(metric => {
    const currentValues = days.flatMap(day => day.date >= currentStart && day[metric.key] != null ? [day[metric.key]!] : []);
    const previousValues = days.flatMap(day => day.date <= previousEnd && day[metric.key] != null ? [day[metric.key]!] : []);
    const current = mean(currentValues);
    const previous = mean(previousValues);
    return {
      ...metric,
      latest: days.find(day => day.date === asOf)?.[metric.key] ?? null,
      current, previous,
      currentCount: currentValues.length, previousCount: previousValues.length,
      // Majority of each calendar week is required; this describes a change, not statistical significance.
      delta: currentValues.length >= 4 && previousValues.length >= 4 && current != null && previous != null
        ? Math.round((current - previous) * 10) / 10 || 0 : null,
    };
  });
  const [sleep, recovery] = metrics;
  let headline = 'Zbieramy dane do porównania';
  if (sleep.delta != null && recovery.delta != null) {
    if (sleep.delta >= 1 && recovery.delta >= 1) headline = 'Sen i regeneracja wyżej niż tydzień temu';
    else if (sleep.delta <= -1 && recovery.delta <= -1) headline = 'Sen i regeneracja niżej niż tydzień temu';
    else if (Math.abs(sleep.delta) < 1 && Math.abs(recovery.delta) < 1) headline = 'Sen i regeneracja na podobnym poziomie';
    else headline = 'Sen i regeneracja zmieniają się różnie';
  }
  return { currentStart, previousStart, previousEnd, headline, metrics };
}

