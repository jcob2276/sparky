import { FC } from 'react';
import Input from '../ui/Input';
import { Search } from 'lucide-react';
import { GpwShortsKpis } from '../../lib/investments/gpwShortsService';

export type ShortsFilterMode = 'all' | 'active' | 'historical';

interface Props {
  search: string;
  onSearchChange: (val: string) => void;
  filterMode: ShortsFilterMode;
  onFilterModeChange: (mode: ShortsFilterMode) => void;
  kpis: GpwShortsKpis;
}

export const GpwShortsControls: FC<Props> = ({
  search,
  onSearchChange,
  filterMode,
  onFilterModeChange,
  kpis,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
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

      <div className="flex items-center gap-2 text-2xs font-mono">
        <span
          role="button"
          tabIndex={0}
          onClick={() => onFilterModeChange(filterMode === 'active' ? 'all' : 'active')}
          onKeyDown={(e) => e.key === 'Enter' && onFilterModeChange(filterMode === 'active' ? 'all' : 'active')}
          className={`cursor-pointer transition-colors ${
            filterMode === 'active' ? 'text-primary font-bold underline' : 'text-text-muted hover:text-text-primary'
          }`}
        >
          {kpis.activeCount} aktywnych spółek
        </span>
        <span className="text-border-custom">·</span>
        <span
          role="button"
          tabIndex={0}
          onClick={() => onFilterModeChange(filterMode === 'historical' ? 'all' : 'historical')}
          onKeyDown={(e) => e.key === 'Enter' && onFilterModeChange(filterMode === 'historical' ? 'all' : 'historical')}
          className={`cursor-pointer transition-colors ${
            filterMode === 'historical' ? 'text-primary font-bold underline' : 'text-text-muted hover:text-text-primary'
          }`}
        >
          {kpis.historicalCount} historycznych
        </span>
      </div>
    </div>
  );
};
