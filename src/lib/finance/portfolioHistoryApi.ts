import { useQuery } from '@tanstack/react-query';
import { getTodayWarsaw, shiftDateStr } from '@vanguard/domain';
import { supabase } from '../supabase';
import { financeKeys } from '../queryKeys';
import type { PricePoint } from './portfolioHistory';

const HISTORY_DAYS = 800;
const PER_TICKER_LIMIT = 1000; // limit wierszy API; 2 lata notowań jednego instrumentu mieści się w jednej stronie

/** Dzienne ceny zamknięcia w PLN dla tickerów (tabela finance_price_history uzupełniana przez worker na VPS). */
export function usePortfolioPrices(tickers: string[]) {
  const sorted = [...new Set(tickers)].sort();
  return useQuery({
    queryKey: financeKeys.priceHistory(sorted),
    enabled: sorted.length > 0,
    staleTime: 6 * 60 * 60 * 1000,
    queryFn: async (): Promise<PricePoint[]> => {
      const since = shiftDateStr(getTodayWarsaw(), -HISTORY_DAYS);
      const pages = await Promise.all(sorted.map(async (ticker) => {
        const { data, error } = await supabase.from('finance_price_history')
          .select('price_date, close_pln').eq('ticker', ticker).gte('price_date', since)
          .order('price_date', { ascending: true }).limit(PER_TICKER_LIMIT);
        if (error) throw error;
        return (data ?? []).map((row): PricePoint => ({ ticker, date: row.price_date, pricePln: Number(row.close_pln) }));
      }));
      return pages.flat();
    },
  });
}
