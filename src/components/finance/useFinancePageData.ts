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

  // Loading, a failed bank read and a data warning are three different things; only a failed read is an error.
  const bankProjection = useMemo<{ data: NonNullable<typeof bundleQuery.data>; loading: boolean; error: string | null; notice: string | null } | undefined>(() => {
    if (!bundleQuery.data) return undefined;
    try {
      const linked = bundleQuery.data.accounts.some(a => a.bank_account_id);
      // Stale bank data with a failed background refresh is still data: the user must not see an error for it.
      if (linked && !bankQuery.data) {
        return bankQuery.error
          ? { data: bundleQuery.data, loading: false, error: 'Nie udało się pobrać sald z banku.', notice: null }
          : { data: bundleQuery.data, loading: true, error: null, notice: null };
      }
      const bundle = bankQuery.data ? mergeBankFinance(bundleQuery.data, bankQuery.data, getTodayWarsaw()) : bundleQuery.data;
      if (bundle.bankReconciliationPending) return { data: bundle, loading: false, error: null, notice: `Uzgodnij ręczne wpisy z bankiem w ustawieniach finansów (${bundle.bankReconciliationPending}), żeby nie policzyć ich podwójnie.` };
      return { data: { ...bundle, accounts: applyCoinPrices(bundle.accounts, coinPricesQuery.data) }, loading: false, error: null, notice: null };
    } catch (err: unknown) { return { data: bundleQuery.data, loading: false, error: err instanceof Error ? err.message : 'Błąd danych bankowych', notice: null }; }
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

  // Quotes still arriving are not a missing valuation: only a settled gap is worth telling the user about.
  const quotesSettled = !holdingsQuery.isLoading && !quotesQuery.isLoading;
  const valuationNotice = quotesSettled && portfolio.unvaluedCount ? 'Brakuje wyceny części portfela. Otwórz Portfel; majątek czeka na kompletne dane.' : null;
  const notice = bankProjection?.notice || valuationNotice;
  const bankLoading = (bankProjection?.loading ?? false) || !quotesSettled;
  const bankError = bankProjection?.error ?? null;
  const metrics = useFinanceMetrics(bankLoading || bankError || notice ? undefined : enrichedData, portfolio.valuePln);

  return {
    bundleQuery,
    bankLoading,
    quotesSettled,
    bankError,
    notice,
    refetchBank: bankQuery.refetch,
    coinPricesQuery,
    holdingsQuery,
    quotesQuery,
    valuedHoldings,
    portfolio,
    data: enrichedData,
    metrics,
  };
}
