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
  const isTrump = (filters.filerName || '').toLowerCase().includes('trump');
  const isPelosi = (filters.filerName || '').toLowerCase().includes('pelosi');
  const isBigMoney = (filters.minAmount || 0) >= 100000;
  const isBuys = filters.transactionType === 'purchase';
  const isSales = filters.transactionType === 'sale';
  const isAll = !filters.filerName && !filters.ticker && !filters.minAmount && (!filters.transactionType || filters.transactionType === 'all');

  return (
    <div className="space-y-3 mb-6">
      {/* Search Input Bar */}
      <div className="relative">
        <Input
          type="text"
          size="md"
          value={filters.query || ''}
          onChange={(e) => onChange({ query: e.target.value })}
          placeholder="Szukaj polityka, tickera (np. NVDA, AAPL) lub spółki..."
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

      {/* Preset Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={isAll ? 'primary' : 'secondary'}
          onClick={() => onChange({ filerName: undefined, ticker: undefined, minAmount: undefined, transactionType: 'all' })}
          className="rounded-lg"
        >
          Wszystko
        </Button>

        <Button
          size="sm"
          variant={isTrump ? 'primary' : 'secondary'}
          onClick={() => onChange({ filerName: isTrump ? undefined : 'Trump' })}
          className="rounded-lg"
        >
          🇺🇸 Donald Trump
        </Button>

        <Button
          size="sm"
          variant={isPelosi ? 'primary' : 'secondary'}
          onClick={() => onChange({ filerName: isPelosi ? undefined : 'Pelosi' })}
          className="rounded-lg"
        >
          🏛 Nancy Pelosi
        </Button>

        <Button
          size="sm"
          variant={isBuys ? 'primary' : 'secondary'}
          onClick={() => onChange({ transactionType: isBuys ? 'all' : 'purchase' })}
          className="rounded-lg"
        >
          🟢 Tylko Kupna
        </Button>

        <Button
          size="sm"
          variant={isSales ? 'primary' : 'secondary'}
          onClick={() => onChange({ transactionType: isSales ? 'all' : 'sale' })}
          className="rounded-lg"
        >
          🔴 Tylko Sprzedaże
        </Button>

        <Button
          size="sm"
          variant={isBigMoney ? 'primary' : 'secondary'}
          onClick={() => onChange({ minAmount: isBigMoney ? undefined : 100000 })}
          className="rounded-lg"
        >
          💎 Duże (&gt; $100k)
        </Button>

        <div className="ml-auto text-xs text-text-secondary font-mono">
          Znaleziono: <strong className="text-text-primary">{resultCount}</strong>
        </div>
      </div>
    </div>
  );
};
