import { useMemo } from 'react';
import { useFinanceBundle } from '../../lib/financeApi';
import { useCoinPrices } from '../../lib/coingeckoApi';
import { applyCoinPrices, extractCoinIds } from '../../lib/finance/accountValues';
import { computePortfolioTotals, valueHoldings } from '@vanguard/domain';
import { useHoldingQuotes, useHoldings } from '../../lib/finance/holdingsApi';
import { useFinanceMetrics } from './useFinanceMetrics';
import { useBankData } from '../../lib/finance/bankApi';
import { mergeBankFinance } from '../../lib/finance/bankFinance';
import { getTodayWarsaw } from '../../lib/date';

export function useFinancePageData(userId: string | undefined) {
  const bundleQuery = useFinanceBundle(userId);
  const bankQuery = useBankData(userId);
  const coinIds = useMemo(
    () => extractCoinIds(bundleQuery.data?.accounts ?? []),
    [bundleQuery.data?.accounts],
  );
  const coinPricesQuery = useCoinPrices(coinIds);

  const bankProjection = useMemo(() => {
    if (!bundleQuery.data) return undefined;
    try {
      const linked = bundleQuery.data.accounts.some(a => a.bank_account_id);
      if (linked && (bankQuery.error || !bankQuery.data)) return { data: bundleQuery.data, error: bankQuery.error?.message || 'Wczytuję salda bankowe…' };
      const bundle = bankQuery.data ? mergeBankFinance(bundleQuery.data, bankQuery.data, getTodayWarsaw()) : bundleQuery.data;
      if (bundle.bankReconciliationPending) return { data: bundle, error: `Uzgodnij ręczne wpisy z bankiem w ustawieniach finansów (${bundle.bankReconciliationPending}), żeby nie policzyć ich podwójnie.` };
      return { data: { ...bundle, accounts: applyCoinPrices(bundle.accounts, coinPricesQuery.data) }, error: null };
    } catch (err: unknown) { return { data: bundleQuery.data, error: err instanceof Error ? err.message : 'Błąd danych bankowych' }; }
  }, [bundleQuery.data, bankQuery.data, bankQuery.error, coinPricesQuery.data]);
  const enrichedData = bankProjection?.data;

  const holdingsQuery = useHoldings(userId);
  const holdings = useMemo(() => holdingsQuery.data ?? [], [holdingsQuery.data]);
  const quotesQuery = useHoldingQuotes(holdings.map((item) => item.ticker));
  const valuedHoldings = useMemo(
    () => valueHoldings(holdings, quotesQuery.data ?? {}),
    [holdings, quotesQuery.data],
  );
  const portfolio = useMemo(() => computePortfolioTotals(valuedHoldings), [valuedHoldings]);

  const valuationError = portfolio.unvaluedCount ? 'Brakuje wyceny części portfela. Otwórz Portfel; majątek czeka na kompletne dane.' : null;
  const metrics = useFinanceMetrics(bankProjection?.error || valuationError ? undefined : enrichedData, portfolio.valuePln);

  return {
    bundleQuery,
    bankError: bankProjection?.error || valuationError,
    coinPricesQuery,
    holdingsQuery,
    quotesQuery,
    valuedHoldings,
    portfolio,
    data: enrichedData,
    metrics,
  };
}
