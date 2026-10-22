export type Agg = 'sum' | 'avg' | 'last';

export interface DatedValue {
  date: string;
  value: number | null;
}

const inRange = (date: string, start: string, end: string) => date >= start && date <= end;

function reduce(values: number[], agg: Agg): number | null {
  if (!values.length) return null;
  if (agg === 'last') return values[values.length - 1];
  const sum = values.reduce((a, b) => a + b, 0);
  return agg === 'sum' ? sum : sum / values.length;
}

/** Wartość z okna `start..end`; brak danych to null (nie 0), więc dziura nie udaje wyniku. */
export function periodValue(rows: DatedValue[], start: string, end: string, agg: Agg): number | null {
  const values = rows
    .filter((row) => row.value != null && inRange(row.date, start, end))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((row) => Number(row.value));
  return reduce(values, agg);
}

/** Ile różnych dni w oknie ma wartość. */
export function daysWithData(rows: DatedValue[], start: string, end: string): number {
  return new Set(rows.filter((row) => row.value != null && inRange(row.date, start, end)).map((row) => row.date)).size;
}

export function bucketSeries(rows: DatedValue[], buckets: Array<{ start: string; end: string }>, agg: Agg): Array<number | null> {
  return buckets.map((bucket) => periodValue(rows, bucket.start, bucket.end, agg));
}

export function delta(current: number | null, previous: number | null): number | null {
  return current == null || previous == null ? null : current - previous;
}
