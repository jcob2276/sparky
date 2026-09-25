import { FC } from 'react';
import { InsiderTradeItem, InvestmentFilters } from '../../lib/investments/investmentsApi';
import { InvestmentsFilters } from './InvestmentsFilters';
import { InvestmentsCard } from './InvestmentsCard';
import Button from '../ui/Button';

interface Props {
  trades: InsiderTradeItem[];
  loading: boolean;
  filters: InvestmentFilters;
  onFilterChange: (updated: Partial<InvestmentFilters>) => void;
  clusterTickers: Set<string>;
}

export const LiveTradesView: FC<Props> = ({
  trades,
  loading,
  filters,
  onFilterChange,
  clusterTickers,
}) => {
  return (
    <div>
      <InvestmentsFilters
        filters={filters}
        onChange={onFilterChange}
        resultCount={trades.length}
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-surface border border-border-custom/50 shadow-xs" />
          ))}
        </div>
      ) : trades.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-surface border border-border-custom/60 shadow-xs my-8">
          <div className="text-3xl mb-3">🔍</div>
          <h3 className="text-base font-bold text-text-primary">Brak transakcji dla wybranych kryteriów</h3>
          <p className="text-sm text-text-secondary mt-1 max-w-md mx-auto">
            Spróbuj zmienić filtry, wyczyścić wyszukiwanie lub kliknąć przycisk „Odśwież feed”.
          </p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onFilterChange({ limit: 60 })}
            className="mt-4 rounded-xl"
          >
            Wyczyść filtry
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trades.map((trade) => (
            <InvestmentsCard
              key={trade.id}
              trade={trade}
              isCluster={Boolean(trade.ticker && clusterTickers.has(trade.ticker))}
            />
          ))}
        </div>
      )}
    </div>
  );
};
