import { useQuery } from '@tanstack/react-query';
import { orcaSelect } from './superinvestorsApi';
import { getTodayWarsaw, shiftDateStr } from '../date';
interface RawDailyPrice { ticker?: string; date?: string; close_raw?: number | null }
export interface IndexResult { dates: string[]; values: number[]; totalReturn: number }
export function computeEqualWeightSeries(watchlist: string[], prices: RawDailyPrice[]): IndexResult | null {
  const tickers = [...new Set(watchlist.map(t => t.toUpperCase()))];
  if (!tickers.length) return null;
  const byDate = new Map<string, Map<string, number>>();
  for (const row of prices) {
    if (!row.date || !row.ticker || row.close_raw == null || !Number.isFinite(row.close_raw) || row.close_raw <= 0) continue;
    const day = byDate.get(row.date) ?? new Map<string, number>();
    day.set(row.ticker.toUpperCase(), row.close_raw);
    byDate.set(row.date, day);
  }
  const dates = [...byDate.keys()].filter(date => tickers.every(t => byDate.get(date)!.has(t))).sort();
  if (dates.length < 2) return null;
  const baseline = byDate.get(dates[0])!;
  const values = dates.map(date => tickers.reduce((sum, ticker) => sum + byDate.get(date)!.get(ticker)! / baseline.get(ticker)!, 0) / tickers.length * 100);
  return { dates, values, totalReturn: Math.round((values[values.length - 1] - 100) * 100) / 100 };
}
export function useDashboardIndex(watchlist: string[]) {
  return useQuery({ queryKey: ['investments', 'dashboardIndex', watchlist], enabled: watchlist.length > 0,
    queryFn: async () => {
      const today = getTodayWarsaw();
      const tickers = watchlist.map(t => encodeURIComponent(t.toUpperCase())).join(',');
      const prices = await orcaSelect<RawDailyPrice>(`prices_daily?select=ticker,date,close_raw&ticker=in.(${tickers})&date=gte.${shiftDateStr(today, -30)}&date=lte.${today}&order=date.asc,ticker.asc`, { strict: true });
      return computeEqualWeightSeries(watchlist, prices);
    }, staleTime: 60_000, retry: 1 });
}
