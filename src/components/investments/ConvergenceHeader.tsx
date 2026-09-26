import { FC } from 'react';
import Button from '../ui/Button';
import { Download, Copy } from 'lucide-react';
import type { SignalWindow } from '../../lib/investments/signalsApi';
import { SignalHorizonBadge } from './SignalHorizonBadge';

interface Props {
  window: SignalWindow;
  windowLabel: string;
  onWindowChange: (w: SignalWindow) => void;
  filterTab: 'convergent' | 'all';
  onFilterTabChange: (tab: 'convergent' | 'all') => void;
  watchlistOnly: boolean;
  onToggleWatchlistOnly: () => void;
  convergentCount: number;
  totalCount: number;
  watchlistCount: number;
  onCopyRanking: () => void;
  onExportCsv: () => void;
  hasRows: boolean;
  onNavigateTab?: (tab: string) => void;
}

export const ConvergenceHeader: FC<Props> = ({
  window,
  windowLabel,
  onWindowChange,
  filterTab,
  onFilterTabChange,
  watchlistOnly,
  onToggleWatchlistOnly,
  convergentCount,
  totalCount,
  watchlistCount,
  onCopyRanking,
  onExportCsv,
  hasRows,
  onNavigateTab,
}) => (
  <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-border-custom shadow-xs space-y-4">
    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-text-primary">
          ZBIEŻNOŚĆ UJAWNIEŃ
        </h1>
        <p className="text-xs text-text-secondary mt-1.5 max-w-2xl leading-relaxed">
          Spółki kupowane równolegle przez fundusze 13F, polityków i insiderów. Zestawienie opisuje fakt o danych, nie zalecenie.
        </p>
        <p className="text-xs text-text-secondary mt-1.5">
          Wynik symulacji koszyka zbieżności jest dostępny w każdym planie.{' '}
          <span
            role="button"
            tabIndex={0}
            onClick={() => onNavigateTab?.('simulation')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onNavigateTab?.('simulation');
            }}
            className="text-primary hover:underline font-semibold cursor-pointer"
          >
            Zobacz symulację koszyka.
          </span>
        </p>

        <div className="flex flex-wrap items-center gap-2 mt-2 pt-1">
          <SignalHorizonBadge source="gpw_mar" compact />
          <SignalHorizonBadge source="congress" compact />
          <SignalHorizonBadge source="13f" compact />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-3xs font-mono text-text-muted">3 ŹRÓDŁA · OKNO {windowLabel}</span>
        {(['90d', '365d'] as const).map((option) => (
          <Button
            key={option}
            size="sm"
            variant={window === option ? 'primary' : 'secondary'}
            className="rounded-xl text-xs font-semibold"
            onClick={() => onWindowChange(option)}
          >
            {option === '90d' ? '90 dni' : '12 mies.'}
          </Button>
        ))}
      </div>
    </div>

    {/* Action Toolbar */}
    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border-custom/40">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={filterTab === 'convergent' && !watchlistOnly ? 'primary' : 'secondary'}
          className="rounded-xl text-xs font-semibold"
          onClick={() => onFilterTabChange('convergent')}
        >
          Zbieżne ({convergentCount})
        </Button>
        <Button
          size="sm"
          variant={filterTab === 'all' && !watchlistOnly ? 'primary' : 'secondary'}
          className="rounded-xl text-xs font-semibold"
          onClick={() => onFilterTabChange('all')}
        >
          Wszystkie ({totalCount})
        </Button>
        <Button
          size="sm"
          variant={watchlistOnly ? 'primary' : 'secondary'}
          className="rounded-xl text-xs font-semibold"
          onClick={onToggleWatchlistOnly}
        >
          Watchlista ({watchlistCount})
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          icon={<Copy size={13} />}
          className="rounded-xl text-xs font-semibold"
          onClick={onCopyRanking}
          disabled={!hasRows}
        >
          Kopiuj
        </Button>
        <Button
          size="sm"
          variant="secondary"
          icon={<Download size={13} />}
          className="rounded-xl text-xs font-semibold"
          disabled={!hasRows}
          onClick={onExportCsv}
        >
          Eksport CSV
        </Button>
      </div>
    </div>
  </div>
);
