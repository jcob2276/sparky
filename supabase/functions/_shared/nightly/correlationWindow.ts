/** Okno analizy korelacji: domyślnie 90 dni (current-first), opcjonalnie dłuższe do roku. */
const DEFAULT_CORRELATION_WINDOW_DAYS = 90
const MIN_CORRELATION_WINDOW_DAYS = 30
const MAX_CORRELATION_WINDOW_DAYS = 365

/** Nieprawidłowa lub brakująca wartość daje domyślne okno; reszta jest przycinana do zakresu. */
export function clampCorrelationWindow(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_CORRELATION_WINDOW_DAYS
  return Math.min(MAX_CORRELATION_WINDOW_DAYS, Math.max(MIN_CORRELATION_WINDOW_DAYS, Math.round(n)))
}

/** Pierwszy dzień okna (YYYY-MM-DD), licząc `days` dni wstecz od dnia warszawskiego. */
export function correlationWindowStart(todayWarsaw: string, days: number): string {
  const d = new Date(todayWarsaw + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

interface PageResult<T> { data: T[] | null; error: { message: string } | null }

/**
 * PostgREST obcina odpowiedź do `max_rows` (1000). Dłuższe okno bez stronicowania
 * po cichu gubiłoby wpisy, więc zapytanie musi mieć stabilne sortowanie (np. po id).
 */
export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize = 1000,
  maxPages = 20,
): Promise<PageResult<T>> {
  const rows: T[] = []
  for (let i = 0; i < maxPages; i++) {
    const { data, error } = await page(i * pageSize, (i + 1) * pageSize - 1)
    if (error) return { data: rows.length ? rows : null, error }
    rows.push(...(data ?? []))
    if (!data || data.length < pageSize) break
  }
  return { data: rows, error: null }
}
