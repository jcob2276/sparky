import { orcaSelect } from './superinvestorsApi';
import { getTodayWarsaw, shiftDateStr } from '../date';

export interface GpwStockItem {
  ticker: string; name: string; isin: string; close: number | null;
  changeTodayPct: number | null; shortPct: number | null; diff14dPp: number | null;
  buys90dCount: number | null; signal: string | null; sparkline12m: number[];
  priceDate?: string | null; priceSourceUrl?: string | null;
  historyStart?: string | null; historyEnd?: string | null;
}
export interface GpwStocksSummary {
  total: number; activeShorts: number; insiderBuys: number; convergenceSignals: number;
}
interface Company { ticker?: string; name?: string; isin?: string }
interface Short { ticker?: string; total_pct?: number; position_date?: string }
interface Trade { ticker?: string; side?: string; transaction_date?: string; report_date?: string }
interface Price {
  ticker: string; close?: number; price_date?: string; source_url?: string; change_pct?: number;
  history_start?: string; history_end?: string; points?: { date: string; price: number }[];
}
const finite = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;

export async function fetchGpwStocksList(): Promise<{ stocks: GpwStockItem[]; summary: GpwStocksSummary }> {
  const today = getTodayWarsaw();
  const since = shiftDateStr(today, -90);
  const [companies, shorts, baseline, trades, prices] = await Promise.all([
    orcaSelect<Company>('gpw_companies?select=isin,ticker,name&order=name.asc', { strict: true }),
    orcaSelect<Short>('vw_gpw_shorts_agg?select=ticker,total_pct&order=ticker.asc', { strict: true }),
    orcaSelect<Short>('vw_knf_shorts_baseline_14d?select=ticker,total_pct,position_date', { strict: true }),
    orcaSelect<Trade>(`vw_gpw_insider_public?select=ticker,side,transaction_date,report_date&side=eq.buy&transaction_date=gte.${since}&transaction_date=lte.${today}`, { strict: true }),
    orcaSelect<Price>('vw_gpw_price_summary?order=ticker.asc', { strict: true }),
  ]);
  if ([companies, shorts, baseline, trades, prices].some(rows => rows.length >= 20000))
    throw new Error('Niepełny odczyt danych GPW');
  const priceMap = new Map(prices.map(row => [row.ticker, row]));
  const shortMap = new Map(shorts.map(row => [row.ticker, row]));
  const baseMap = new Map(baseline.filter(row => row.position_date && row.position_date <= shiftDateStr(today, -14))
    .map(row => [row.ticker, row]));
  const buys = new Map<string, number>();
  for (const row of trades) if (row.ticker && row.side === 'buy' && row.transaction_date
    && row.transaction_date >= since && row.transaction_date <= today)
    buys.set(row.ticker, (buys.get(row.ticker) ?? 0) + 1);
  // Multiple registry records can refer to the same quoted listing.
  const listings = new Map<string, Company>();
  for (const company of companies) if (company.ticker && !listings.has(company.ticker.toUpperCase()))
    listings.set(company.ticker.toUpperCase(), company);
  const stocks = [...listings.values()].flatMap(company => {
    if (!company.ticker) return [];
    const ticker = company.ticker.toUpperCase();
    const price = priceMap.get(`${ticker}.WA`);
    const shortPct = finite(shortMap.get(ticker)?.total_pct);
    const old = finite(baseMap.get(ticker)?.total_pct);
    const diff14dPp = shortPct != null && old != null ? Math.round((shortPct - old) * 100) / 100 : null;
    const buys90dCount = buys.get(ticker) ?? null;
    const points = (price?.points ?? []).filter(point => point.date <= today && finite(point.price) != null && point.price > 0);
    return [{ ticker, name: company.name || ticker, isin: company.isin || '',
      close: finite(price?.close), priceDate: price?.price_date ?? null,
      priceSourceUrl: price?.source_url ?? null, historyStart: price?.history_start ?? null,
      historyEnd: price?.history_end ?? null,
      changeTodayPct: price?.price_date === today ? finite(price.change_pct) : null,
      shortPct, diff14dPp, buys90dCount,
      signal: diff14dPp != null && diff14dPp > 0.05 && (shortPct ?? 0) >= 1 ? 'short rośnie'
        : (buys90dCount ?? 0) >= 3 && (shortPct ?? 0) >= 2 ? 'zbieżność' : null,
      sparkline12m: points.length >= 2 ? points.map(point => point.price) : [],
    }];
  });
  stocks.sort((a, b) => (b.shortPct ?? -1) - (a.shortPct ?? -1));
  return { stocks, summary: { total: stocks.length,
    activeShorts: stocks.filter(row => (row.shortPct ?? 0) >= 0.5).length,
    insiderBuys: stocks.filter(row => row.buys90dCount != null).length,
    convergenceSignals: stocks.filter(row => row.signal === 'zbieżność').length } };
}
