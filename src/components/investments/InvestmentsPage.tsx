import { FC, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchInsiderTrades,
  fetchInvestmentStats,
  syncInsiderTradesDirect,
  InsiderTradeItem,
  InvestmentFilters,
  InvestmentStats,
} from '../../lib/investments/investmentsApi';
import { notify } from '../../lib/notify';
import { InvestmentsHeader } from './InvestmentsHeader';
import { InvestmentsFilters } from './InvestmentsFilters';
import { InvestmentsCard } from './InvestmentsCard';
import Button from '../ui/Button';

export const InvestmentsPage: FC = () => {
  const navigate = useNavigate();
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

        if (items.length === 0 && !filters.query && !filters.filerName && !filters.ticker) {
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
      notify('Pobieram najnowsze zawiadomienia ze źródeł rządowych USA...', 'info');
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

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation back bar */}
        <div className="mb-6 flex items-center justify-between">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-xs text-text-secondary hover:text-text-primary"
          >
            ← Wróć do aplikacji
          </Button>

          <span className="text-xs font-mono text-text-muted">
            Sparky OS · Moduł Finansowy
          </span>
        </div>

        <InvestmentsHeader stats={stats} syncing={syncing} onRefresh={handleRefresh} />

        <InvestmentsFilters
          filters={filters}
          onChange={handleFilterChange}
          resultCount={trades.length}
        />

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-44 rounded-xl bg-card border border-border-custom/30" />
            ))}
          </div>
        ) : trades.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-card border border-border-custom/50 my-8">
            <div className="text-3xl mb-3">🔍</div>
            <h3 className="text-base font-semibold text-text-primary">Brak transakcji dla wybranych kryteriów</h3>
            <p className="text-sm text-text-secondary mt-1 max-w-md mx-auto">
              Spróbuj zmienić filtry, wyczyścić wyszukiwanie lub kliknąć przycisk „Odśwież feed”.
            </p>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setFilters({ limit: 60 })}
              className="mt-4 rounded-xl"
            >
              Wyczyść filtry
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trades.map((trade) => (
              <InvestmentsCard key={trade.id} trade={trade} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InvestmentsPage;
