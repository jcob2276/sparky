import { FC } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { Search } from 'lucide-react';
import { GpwStocksSummary } from '../../lib/investments/gpwCompaniesService';

interface Props {
  search: string;
  onSearchChange: (val: string) => void;
  filterSignal: boolean;
  onToggleSignal: () => void;
  filterInsiderSort: boolean;
  onToggleInsiderSort: () => void;
  filterOnlyBuys: boolean;
  onToggleOnlyBuys: () => void;
  summary: GpwStocksSummary;
  totalFiltered: number;
}

export const GpwCompaniesHeader: FC<Props> = ({
  search,
  onSearchChange,
  filterSignal,
  onToggleSignal,
  filterInsiderSort,
  onToggleInsiderSort,
  filterOnlyBuys,
  onToggleOnlyBuys,
  summary,
}) => {
  return (
    <div className="space-y-4">
      {/* Title & Subtitle */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
          Spółki GPW
        </h1>
        <p className="text-xs text-text-secondary mt-1 max-w-3xl leading-relaxed">
          418 tickerów .WA · rejestr KNF (krótka sprzedaż) + zawiadomienia MAR 19 (ESPI) + kursy
          EOD + sygnał zbieżności
        </p>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="w-full sm:w-72">
          <Input
            type="text"
            placeholder="Szukaj spółki lub tickera..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="text-xs"
            icon={<Search size={14} />}
          />
        </div>

        <Button
          size="sm"
          variant={filterSignal ? 'primary' : 'outline'}
          onClick={onToggleSignal}
          className={`text-2xs font-semibold rounded-lg px-3.5 ${
            filterSignal
              ? 'bg-success text-white border-success'
              : 'border-success/60 text-success hover:bg-success/10'
          }`}
        >
          Sygnał
        </Button>

        <Button
          size="sm"
          variant={filterInsiderSort ? 'primary' : 'secondary'}
          onClick={onToggleInsiderSort}
          className="text-2xs font-semibold rounded-lg px-3.5"
        >
          Zakupy insiderów
        </Button>

        <Button
          size="sm"
          variant={filterOnlyBuys ? 'primary' : 'secondary'}
          onClick={onToggleOnlyBuys}
          className="text-2xs font-semibold rounded-lg px-3.5"
        >
          tylko z zakupami
        </Button>
      </div>

      {/* Stats Counter Line */}
      <div className="text-3xs font-mono font-medium text-text-muted">
        {summary.total} spółek · {summary.activeShorts} z aktywnym shortem · {summary.insiderBuys} z zakupami insiderów ·{' '}
        {summary.convergenceSignals > 0
          ? `${summary.convergenceSignals} sygnałów zbieżności dziś`
          : 'brak sygnałów zbieżności dziś'}
      </div>
    </div>
  );
};
