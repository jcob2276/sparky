import { FC } from 'react';
import { InvestmentFilters } from '../../lib/investments/investmentsApi';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface Props {
  filters: InvestmentFilters;
  onChange: (updated: Partial<InvestmentFilters>) => void;
  resultCount: number;
}

export const InvestmentsFilters: FC<Props> = ({ filters, onChange, resultCount }) => {
  const isBigMoney = (filters.minAmount || 0) >= 100000;
  const isBuys = filters.transactionType === 'purchase';
  const isSales = filters.transactionType === 'sale';
  const isGpw = filters.market === 'gpw';
  const isUs = filters.market === 'us';
  const isCluster = Boolean(filters.clusterOnly);
  const isAll = !filters.filerName && !filters.ticker && !filters.minAmount && (!filters.transactionType || filters.transactionType === 'all') && !filters.market && !filters.clusterOnly;

  return (
    <div className="space-y-3.5 mb-6">
      {/* Search Input Bar */}
      <div className="relative">
        <Input
          type="text"
          size="md"
          value={filters.query || ''}
          onChange={(e) => onChange({ query: e.target.value })}
          placeholder="Szukaj polityka, spółki (np. NVDA, CDR, Dino, Allegro, AAPL) lub tickera..."
          icon={<span>🔍</span>}
        />
        {filters.query && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChange({ query: '' })}
            className="absolute right-2 top-2 px-1.5 py-0.5"
          >
            ✕
          </Button>
        )}
      </div>

      {/* Market & Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={isAll ? 'primary' : 'secondary'}
          onClick={() => onChange({ filerName: undefined, ticker: undefined, minAmount: undefined, transactionType: 'all', market: undefined, clusterOnly: undefined })}
          className="rounded-xl"
        >
          Wszystko
        </Button>

        <Button
          size="sm"
          variant={isUs ? 'primary' : 'secondary'}
          onClick={() => onChange({ market: isUs ? undefined : 'us' })}
          className="rounded-xl"
        >
          🇺🇸 USA (Kongres)
        </Button>

        <Button
          size="sm"
          variant={isGpw ? 'primary' : 'secondary'}
          onClick={() => onChange({ market: isGpw ? undefined : 'gpw' })}
          className="rounded-xl"
        >
          🇵🇱 GPW (Warszawa)
        </Button>

        <Button
          size="sm"
          variant={isCluster ? 'primary' : 'secondary'}
          onClick={() => onChange({ clusterOnly: isCluster ? undefined : true })}
          className="rounded-xl"
        >
          🔥 Klastry Zakupowe
        </Button>

        <Button
          size="sm"
          variant={isBuys ? 'primary' : 'secondary'}
          onClick={() => onChange({ transactionType: isBuys ? 'all' : 'purchase' })}
          className="rounded-xl"
        >
          🟢 Tylko Kupna
        </Button>

        <Button
          size="sm"
          variant={isSales ? 'primary' : 'secondary'}
          onClick={() => onChange({ transactionType: isSales ? 'all' : 'sale' })}
          className="rounded-xl"
        >
          🔴 Tylko Sprzedaże
        </Button>

        <Button
          size="sm"
          variant={isBigMoney ? 'primary' : 'secondary'}
          onClick={() => onChange({ minAmount: isBigMoney ? undefined : 100000 })}
          className="rounded-xl"
        >
          🐋 Duże ($100k+)
        </Button>

        <div className="ml-auto text-xs text-text-secondary font-mono tabular-nums">
          Znaleziono: <strong className="text-text-primary font-bold">{resultCount}</strong>
        </div>
      </div>
    </div>
  );
};
