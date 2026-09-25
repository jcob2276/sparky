import { useState, useEffect } from 'react';
import {
  fetchInsiderTrades,
  fetchInvestmentStats,
  syncInsiderTradesDirect,
  detectClusterTickers,
  InsiderTradeItem,
  InvestmentFilters,
  InvestmentStats,
} from '../../lib/investments/investmentsApi';
import { notify } from '../../lib/notify';

export function useInvestmentsData() {
  const [trades, setTrades] = useState<InsiderTradeItem[]>([]);
  const [stats, setStats] = useState<InvestmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filters, setFilters] = useState<InvestmentFilters>({ limit: 60 });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [items, statsData] = await Promise.all([
          fetchInsiderTrades(filters),
          fetchInvestmentStats(),
        ]);
        if (!active) return;

        if (items.length === 0 && !filters.query && !filters.filerName && !filters.ticker && !filters.market) {
          setSyncing(true);
          await syncInsiderTradesDirect(300);
          if (!active) return;
          const [reItems, reStats] = await Promise.all([
            fetchInsiderTrades(filters),
            fetchInvestmentStats(),
          ]);
          if (!active) return;
          setTrades(reItems);
          setStats(reStats);
        } else {
          setTrades(items);
          setStats(statsData);
        }
      } catch (err: unknown) {
        if (!active) return;
        console.error('[InvestmentsPage] load error:', err);
        notify('Błąd pobierania danych transakcji', 'error');
      } finally {
        if (active) {
          setLoading(false);
          setSyncing(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [filters]);

  const handleRefresh = async () => {
    try {
      setSyncing(true);
      notify('Pobieram najnowsze zawiadomienia ze źródeł rządowych USA & GPW MAR...', 'info');
      const res = await syncInsiderTradesDirect(400);
      const [items, statsData] = await Promise.all([
        fetchInsiderTrades(filters),
        fetchInvestmentStats(),
      ]);
      setTrades(items);
      setStats(statsData);
      notify(`Pomyślnie zsynchronizowano ${res.count} transakcji!`, 'success');
    } catch (err: unknown) {
      console.error('[InvestmentsPage] sync error:', err);
      notify('Nie udało się pobrać najnowszego feedu', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleFilterChange = (updated: Partial<InvestmentFilters>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
  };

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
  };
}
