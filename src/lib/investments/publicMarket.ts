import { orcaSelect } from './superinvestorsApi';

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return null;
}

export interface BacktestPoint {
  asof: string;
  cumulativePct: number;
  periodPct: number;
  funds: number;
}

export async function fetchBasketBacktest(): Promise<BacktestPoint[]> {
  const rows = await orcaSelect<{
    asof?: string;
    cumulative?: number | string;
    ret?: number | string;
    n_funds?: number | string;
  }>(
    'convergence_backtest?select=asof,cumulative,ret,n_funds&kind=eq.basket&ticker=eq.__PORTFEL__&order=asof.asc&limit=80',
  );
  return rows.flatMap((row) => {
    const cumulative = num(row.cumulative);
    if (!row.asof || cumulative == null) return [];
    return [{
      asof: row.asof,
      cumulativePct: cumulative * 100,
      periodPct: (num(row.ret) ?? 0) * 100,
      funds: num(row.n_funds) ?? 0,
    }];
  });
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


