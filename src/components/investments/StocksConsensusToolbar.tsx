import { FC, useRef, useState, useEffect } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Download, Search, SlidersHorizontal, ChevronDown } from 'lucide-react';

export type FilterType = 'all' | 'accumulation' | 'distribution' | 'active';

export type SortOption =
  | 'capitalization'
  | 'net'
  | 'buyers'
  | 'sellers'
  | 'holders'
  | 'value'
  | 'ticker';

const SORT_LABELS: Record<SortOption, string> = {
  capitalization: 'Kapitalizacja',
  net: 'Netto kupujący',
  buyers: 'Liczba kupujących',
  sellers: 'Liczba sprzedających',
  holders: 'Trzymający',
  value: 'Łączna wartość',
  ticker: 'Ticker A→Z',
};

interface Props {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filterType: FilterType;
  onFilterChange: (f: FilterType) => void;
  sortOption: SortOption;
  onSortChange: (s: SortOption) => void;
  totalFilteredCount: number;
  onExportCsv: () => void;
  mostActiveTicker: string;
  mostActiveMoves: number;
}

export const StocksConsensusToolbar: FC<Props> = ({
  searchQuery,
  onSearchChange,
  filterType,
  onFilterChange,
  sortOption,
  onSortChange,
  totalFilteredCount,
  onExportCsv,
  mostActiveTicker,
  mostActiveMoves,
}) => {
  const [isSortOpen, setIsSortOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-3">
      {/* Toolbar controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-64">
          {/* Search Box */}
          <div className="w-64 max-w-full">
            <Input
              size="sm"
              icon={<Search size={14} />}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Szukaj tickera lub spółki..."
              className="rounded-xl text-xs"
            />
          </div>

          {/* Filter Pills using UI Button */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              size="sm"
              variant={filterType === 'all' ? 'primary' : 'secondary'}
              onClick={() => onFilterChange('all')}
              className="rounded-xl text-3xs font-bold uppercase"
            >
              Wszystkie
            </Button>
            <Button
              size="sm"
              variant={filterType === 'accumulation' ? 'primary' : 'secondary'}
              onClick={() => onFilterChange('accumulation')}
              className="rounded-xl text-3xs font-bold uppercase"
            >
              Akumulacja
            </Button>
            <Button
              size="sm"
              variant={filterType === 'distribution' ? 'primary' : 'secondary'}
              onClick={() => onFilterChange('distribution')}
              className="rounded-xl text-3xs font-bold uppercase"
            >
              Dystrybucja
            </Button>
            <Button
              size="sm"
              variant={filterType === 'active' ? 'primary' : 'secondary'}
              onClick={() => onFilterChange('active')}
              className="rounded-xl text-3xs font-bold uppercase"
            >
              Duży ruch
            </Button>
          </div>

          {/* Sort Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <Button
              size="sm"
              variant="secondary"
              icon={<SlidersHorizontal size={13} className="text-text-muted" />}
              onClick={() => setIsSortOpen((v) => !v)}
              className="rounded-xl text-xs font-semibold"
            >
              <span>{SORT_LABELS[sortOption]}</span>
              <ChevronDown size={13} className="text-text-muted ml-0.5" />
            </Button>

            {isSortOpen && (
              <div className="absolute left-0 mt-1.5 w-48 bg-surface border border-border-custom rounded-2xl shadow-xl z-[var(--z-popover)] py-1 overflow-hidden animate-fade-in">
                {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
                  <Button
                    key={opt}
                    size="sm"
                    variant={sortOption === opt ? 'primary' : 'ghost'}
                    onClick={() => {
                      onSortChange(opt);
                      setIsSortOpen(false);
                    }}
                    className="w-full justify-start rounded-none px-3.5 py-2 text-xs"
                  >
                    <span>{SORT_LABELS[opt]}</span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Counter and Export */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-text-secondary font-mono">
            {totalFilteredCount} spółek
          </span>
          <Button
            size="sm"
            variant="secondary"
            icon={<Download size={13} />}
            onClick={onExportCsv}
            className="rounded-xl text-xs font-semibold"
          >
            <span>Eksport CSV</span>
            <span className="ml-1 px-1 py-0.2 rounded text-3xs font-mono font-bold bg-warning/20 text-warning border border-warning/30">
              PRO
            </span>
          </Button>
        </div>
      </div>

      {/* Highlight Banner */}
      {mostActiveTicker && mostActiveTicker !== '—' && (
        <div className="px-4 py-2.5 rounded-2xl bg-success/10 border border-success/20 flex items-center gap-2 text-xs">
          <span className="font-mono font-black text-success">
            {mostActiveTicker}
          </span>
          <span className="text-text-primary">
            Najbardziej aktywny ticker w próbce: {mostActiveMoves} ruchów funduszy.
          </span>
        </div>
      )}
    </div>
  );
};
