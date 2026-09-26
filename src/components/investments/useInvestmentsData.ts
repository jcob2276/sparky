import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  detectClusterTickers,
  InsiderTradeItem,
  InvestmentFilters,
  InvestmentStats,
} from '../../lib/investments/investmentsApi';
import { fetchForm4History, fetchNamedForm4 } from '../../lib/investments/form4Public';
import { fetchForm4Trades } from '../../lib/investments/publicDisclosures';
import { notify } from '../../lib/notify';

function matchesTrade(trade: InsiderTradeItem, filters: InvestmentFilters): boolean {
  const query = filters.query?.trim().toLowerCase();
  if (query) {
    const haystack = `${trade.filer_name} ${trade.ticker ?? ''} ${trade.asset_name ?? ''}`.toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  if (filters.filerName && !trade.filer_name.toLowerCase().includes(filters.filerName.toLowerCase())) return false;
  if (filters.ticker && (trade.ticker ?? '').toUpperCase() !== filters.ticker.trim().toUpperCase()) return false;
  if (filters.party && (trade.party ?? '').toUpperCase() !== filters.party.trim().toUpperCase()) return false;
  if (filters.market === 'gpw' && trade.state !== 'PL') return false;
  if (filters.market === 'us' && trade.state === 'PL') return false;
  const type = trade.transaction_type.toLowerCase();
  if (filters.transactionType === 'purchase' && !type.includes('purchase') && !type.includes('buy')) return false;
  if (filters.transactionType === 'sale' && !type.includes('sale') && !type.includes('sell')) return false;
  if (filters.minAmount && (trade.amount_high ?? 0) < filters.minAmount) return false;
  return true;
}

function summarize(items: InsiderTradeItem[]): InvestmentStats {
  let purchases = 0;
  let sales = 0;
  const filers = new Set<string>();
  for (const item of items) {
    filers.add(item.filer_name);
    const type = item.transaction_type.toLowerCase();
    if (type.includes('purchase') || type.includes('buy')) purchases += 1;
    if (type.includes('sale') || type.includes('sell')) sales += 1;
  }
  return {
    totalTrades: items.length,
    purchasesCount: purchases,
    salesCount: sales,
    distinctFilers: filers.size,
    recentCount30d: items.length,
  };
}

export function useInvestmentsData() {
  const [allTrades, setAllTrades] = useState<InsiderTradeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filters, setFilters] = useState<InvestmentFilters>({ limit: 60 });
  const [historyTruncated, setHistoryTruncated] = useState(false);

  const load = useCallback(async (query = '') => {
    const needle = query.trim();
    if (needle.length >= 2) {
      const history = await fetchForm4History(needle);
      setAllTrades(history.rows);
      setHistoryTruncated(history.truncated);
      return history.rows.length;
    }
    const named = await fetchNamedForm4().catch(() => []);
    const next = named.length > 0 ? named : await fetchForm4Trades();
    setAllTrades(next);
    setHistoryTruncated(false);
    return next.length;
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      load(filters.query ?? '')
        .catch((err: unknown) => {
          if (!active) return;
          console.error('[InvestmentsPage] load error:', err);
          notify('Błąd pobierania publicznych zgłoszeń Form 4', 'error');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 280);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [filters.query, load]);

  const handleRefresh = async () => {
    try {
      setSyncing(true);
      const count = await load(filters.query ?? '');
      notify(`Pobrano ${count} publicznych zgłoszeń Form 4.`, 'success');
    } catch (err: unknown) {
      console.error('[InvestmentsPage] sync error:', err);
      notify('Nie udało się pobrać publicznych zgłoszeń Form 4', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleFilterChange = (updated: Partial<InvestmentFilters>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
  };

  const trades = useMemo(
    () => allTrades.filter((trade) => matchesTrade(trade, filters)),
    [allTrades, filters],
  );

  const stats = useMemo(() => summarize(trades), [trades]);
  const clusterTickers = detectClusterTickers(trades);

  return {
    trades,
    stats,
    loading,
    syncing,
    filters,
    handleRefresh,
    handleFilterChange,
    clusterTickers,
    historyTruncated,
  };
}
