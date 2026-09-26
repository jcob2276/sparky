import { FC } from 'react';
import Button from '../ui/Button';
import { CompanyLogo } from './CompanyLogo';
import { ChevronLeft, Star } from 'lucide-react';
import type { CompanyDetailData } from '../../lib/investments/companyDetailService';

export type CompanyDetailTab = 'overview' | '13f' | 'politicians' | 'insiders';

interface Props {
  data: CompanyDetailData;
  activeTab: CompanyDetailTab;
  onTabChange: (tab: CompanyDetailTab) => void;
  isWatched: boolean;
  onToggleWatchlist: () => void;
  onBack: () => void;
}

export const CompanyDetailHeader: FC<Props> = ({
  data,
  activeTab,
  onTabChange,
  isWatched,
  onToggleWatchlist,
  onBack,
}) => {
  const isPosChange = data.changeTodayPct >= 0;
  const isPos1y = data.change1yPct >= 0;

  return (
    <div className="space-y-4">
      {/* Back button */}
      <div>
        <Button
          size="sm"
          variant="ghost"
          icon={<ChevronLeft size={14} />}
          onClick={onBack}
          className="text-primary text-xs font-bold hover:underline px-0 h-auto"
        >
          SPÓŁKI
        </Button>
      </div>

      {/* Main Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Logo & Names */}
        <div className="flex items-center gap-3.5">
          <CompanyLogo ticker={data.ticker} name={data.name} size={44} />
          <div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-text-primary">
              {data.name}
            </h1>
            <div className="text-2xs font-mono text-text-muted mt-0.5">
              <span>{data.ticker}</span>
              <span className="mx-1.5">·</span>
              <span>{data.exchange}</span>
              <span className="mx-1.5">·</span>
              <span>{data.sector}</span>
            </div>
          </div>
        </div>

        {/* Right: Price & Watchlist CTA */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-black font-mono text-text-primary tabular-nums">
              {data.price > 0 ? data.price.toFixed(2).replace('.', ',') : '—'}
            </div>
            <div className="text-3xs font-mono text-text-muted flex items-center justify-end gap-1.5 mt-0.5">
              <span className={isPosChange ? 'text-success font-semibold' : 'text-danger font-semibold'}>
                {isPosChange ? `+${data.changeTodayPct.toFixed(1).replace('.', ',')}%` : `${data.changeTodayPct.toFixed(1).replace('.', ',')}%`}
              </span>
              <span>·</span>
              <span className={isPos1y ? 'text-success font-semibold' : 'text-danger font-semibold'}>
                {isPos1y ? `+${data.change1yPct.toFixed(1).replace('.', ',')}%` : `${data.change1yPct.toFixed(1).replace('.', ',')}%`} R/R
              </span>
            </div>
          </div>

          <Button
            size="sm"
            variant={isWatched ? 'secondary' : 'tonal'}
            icon={<Star size={13} className={isWatched ? 'fill-warning text-warning' : ''} />}
            onClick={onToggleWatchlist}
            className="rounded-xl text-xs font-semibold uppercase tracking-wider"
          >
            {isWatched ? 'Obserwujesz' : 'Obserwuj'}
          </Button>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-1 border-b border-border-custom/50 pt-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onTabChange('overview')}
          className={`rounded-none px-4 py-2 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'overview'
              ? 'border-primary text-text-primary'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          Przegląd
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onTabChange('13f')}
          className={`rounded-none px-4 py-2 text-xs font-bold border-b-2 transition-all ${
            activeTab === '13f'
              ? 'border-primary text-text-primary'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          Fundusze 13F
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onTabChange('politicians')}
          className={`rounded-none px-4 py-2 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'politicians'
              ? 'border-primary text-text-primary'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          Politycy
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onTabChange('insiders')}
          className={`rounded-none px-4 py-2 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'insiders'
              ? 'border-primary text-text-primary'
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          Insiderzy
        </Button>
      </div>
    </div>
  );
};
