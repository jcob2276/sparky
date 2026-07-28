export type OuraMissingSource = 'oura_daily_summary' | 'oura_enhanced';

type DatedRow = { date: string | null };

export interface CanonicalOuraDay<S extends DatedRow, E extends DatedRow> {
  date: string;
  summary: S | null;
  enhanced: E | null;
  missingSources: OuraMissingSource[];
  previous: Omit<CanonicalOuraDay<S, E>, 'previous'> | null;
}

interface SelectCanonicalOuraDayInput<S extends DatedRow, E extends DatedRow> {
  preferredDate: string;
  summaries: S[];
  enhanced: E[];
}

function rowsByDate<T extends DatedRow>(rows: T[]): Map<string, T> {
  return new Map(
    rows.flatMap((row) => row.date ? [[row.date, row] as const] : []),
  );
}

function assembleDay<S extends DatedRow, E extends DatedRow>(
  date: string,
  summaries: Map<string, S>,
  enhanced: Map<string, E>,
): Omit<CanonicalOuraDay<S, E>, 'previous'> {
  const summary = summaries.get(date) ?? null;
  const enhancedRow = enhanced.get(date) ?? null;
  const missingSources: OuraMissingSource[] = [];

  if (!summary) missingSources.push('oura_daily_summary');
  if (!enhancedRow) missingSources.push('oura_enhanced');

  return { date, summary, enhanced: enhancedRow, missingSources };
}

export function selectCanonicalOuraDay<S extends DatedRow, E extends DatedRow>(
  input: SelectCanonicalOuraDayInput<S, E>,
): CanonicalOuraDay<S, E> | null {
  const summaries = rowsByDate(input.summaries);
  const enhanced = rowsByDate(input.enhanced);
  const summaryDates = [...summaries.keys()].sort((a, b) => b.localeCompare(a));
  const selectedDate = summaries.has(input.preferredDate)
    ? input.preferredDate
    : summaryDates[0];

  if (!selectedDate) return null;

  const previousDate = summaryDates.find((date) => date < selectedDate) ?? null;

  return {
    ...assembleDay(selectedDate, summaries, enhanced),
    previous: previousDate
      ? assembleDay(previousDate, summaries, enhanced)
      : null,
  };
}
