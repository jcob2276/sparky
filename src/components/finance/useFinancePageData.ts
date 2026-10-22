import { useMemo } from 'react';
import { useFinanceBundle } from '../../lib/financeApi';
import { useCoinPrices } from '../../lib/coingeckoApi';
import { applyCoinPrices, extractCoinIds } from '../../lib/finance/accountValues';
import { computePortfolioTotals, valueHoldings } from '@vanguard/domain';
import { useHoldingQuotes, useHoldings } from '../../lib/finance/holdingsApi';
import { useFinanceMetrics } from './useFinanceMetrics';

export function useFinancePageData(userId: string | undefined) {
  const bundleQuery = useFinanceBundle(userId);
  const coinIds = useMemo(
    () => extractCoinIds(bundleQuery.data?.accounts ?? []),
    [bundleQuery.data?.accounts],
  );
  const coinPricesQuery = useCoinPrices(coinIds);

  const enrichedData = useMemo(() => {
    if (!bundleQuery.data) return undefined;
    return {
      ...bundleQuery.data,
      accounts: applyCoinPrices(bundleQuery.data.accounts, coinPricesQuery.data),
    };
  }, [bundleQuery.data, coinPricesQuery.data]);

  const holdingsQuery = useHoldings(userId);
  const holdings = useMemo(() => holdingsQuery.data ?? [], [holdingsQuery.data]);
  const quotesQuery = useHoldingQuotes(holdings.map((item) => item.ticker));
  const valuedHoldings = useMemo(
    () => valueHoldings(holdings, quotesQuery.data ?? {}),
    [holdings, quotesQuery.data],
  );
  const portfolio = useMemo(() => computePortfolioTotals(valuedHoldings), [valuedHoldings]);

  const metrics = useFinanceMetrics(enrichedData, portfolio.valuePln);

  return {
    bundleQuery,
    coinPricesQuery,
    holdingsQuery,
    quotesQuery,
    valuedHoldings,
    portfolio,
    data: enrichedData,
    metrics,
  };
}
