import { orcaSelect } from './superinvestorsApi';

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return null;
}

export interface QuotePoint {
  date: string;
  close: number;
}

export async function fetchQuote(ticker: string, from: string): Promise<QuotePoint[]> {
  const safe = ticker.replace(/[^A-Za-z0-9.]/g, '').toUpperCase();
  const start = from.slice(0, 10);
  if (!safe || !/^\d{4}-\d{2}-\d{2}$/.test(start)) return [];
  const rows = await orcaSelect<{ date?: string; close_adj?: number | string }>(
    `prices_daily?select=date,close_adj&ticker=eq.${encodeURIComponent(safe)}&date=gte.${start}&order=date.asc&limit=1500`,
  );
  return rows.flatMap((row) => {
    const close = num(row.close_adj);
    if (!row.date || close == null) return [];
    return [{ date: row.date, close }];
  });
}


