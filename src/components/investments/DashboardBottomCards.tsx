import { FC } from 'react';
import Button from '../ui/Button';
import { ArrowRight, Flame } from 'lucide-react';
import { DashboardData } from '../../lib/investments/dashboardService';
import { CompanyLogo } from './CompanyLogo';

interface Props {
  topConvergence: DashboardData['topConvergenceUsa'];
  topGpwShorts?: DashboardData['topGpwShorts'];
  onNavigateTab: (tab: string) => void;
}

const ConvergenceUsaCard: FC<{
  items: DashboardData['topConvergenceUsa'];
  onNavigateTab: (tab: string) => void;
}> = ({ items, onNavigateTab }) => (
  <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-border-custom shadow-xs flex flex-col justify-between">
    <div>
      <div className="flex items-center justify-between pb-3 border-b border-border-custom/40">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-black uppercase tracking-wider text-text-muted">
            Top zbieżność USA
          </span>
          <span className="px-1.5 py-0.5 rounded text-3xs font-mono font-bold bg-primary/10 text-primary border border-primary/20">
            LIVE
          </span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onNavigateTab('convergence')}
          icon={<ArrowRight size={13} />}
          iconPosition="right"
          className="text-xs font-semibold text-primary"
        >
          ranking
        </Button>
      </div>

      <div className="mt-3 divide-y divide-border-custom/30">
        {items.map((item) => (
          <div
            key={item.ticker}
            className="py-2.5 flex items-center justify-between gap-2 hover:bg-surface-elevated/40 rounded-xl px-1 transition-colors cursor-pointer"
            onClick={() => onNavigateTab('convergence')}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <CompanyLogo ticker={item.ticker} size={28} />
              <div className="min-w-0">
                <div className="font-mono font-bold text-xs text-text-primary">
                  {item.ticker}
                </div>
                <div className="text-3xs text-text-secondary truncate max-w-28">
                  {item.name}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded-md text-3xs font-mono font-bold bg-success/15 text-success border border-success/30">
                +{item.fundsNet} fundusze
              </span>
              <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-black bg-primary/15 text-primary border border-primary/30">
                {item.score}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>

    <p className="text-3xs text-text-muted pt-3 border-t border-border-custom/30 mt-3 flex items-center gap-1">
      <Flame size={12} className="text-warning shrink-0" />
      Fundusze i politycy kupują te same spółki w oknie kwartalnym
    </p>
  </div>
);

const GpwShortsCard: FC<{
  items: NonNullable<DashboardData['topGpwShorts']>;
  onNavigateTab: (tab: string) => void;
}> = ({ items, onNavigateTab }) => (
  <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-border-custom shadow-xs flex flex-col justify-between">
    <div>
      <div className="flex items-center justify-between pb-3 border-b border-border-custom/40">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-black uppercase tracking-wider text-text-muted">
            Największe szorty GPW
          </span>
          <span className="px-1.5 py-0.5 rounded text-3xs font-mono font-bold bg-danger/10 text-danger border border-danger/20">
            KNF
          </span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onNavigateTab('gpw_shorts')}
          icon={<ArrowRight size={13} />}
          iconPosition="right"
          className="text-xs font-semibold text-primary"
        >
          rejestr
        </Button>
      </div>

      {items && items.length > 0 ? (
        <div className="mt-3 divide-y divide-border-custom/30">
          {items.map((item) => (
            <div
              key={item.ticker}
              className="py-2.5 flex items-center justify-between gap-2 hover:bg-surface-elevated/40 rounded-xl px-1 transition-colors cursor-pointer"
              onClick={() => onNavigateTab('gpw_shorts')}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <CompanyLogo ticker={item.ticker} size={28} />
                <div className="min-w-0">
                  <div className="font-mono font-bold text-xs text-text-primary">
                    {item.ticker}
                  </div>
                  <div className="text-3xs text-text-secondary truncate max-w-28">
                    {item.company}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-danger/15 text-danger border border-danger/30">
                  {item.totalPct.toFixed(2).replace('.', ',')}%
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center text-xs text-text-secondary">
          Brak aktywnych pozycji w rejestrze KNF.
        </div>
      )}
    </div>

    <p className="text-3xs text-text-muted pt-3 border-t border-border-custom/30 mt-3 flex items-center gap-1">
      Oficjalne pozycje krótkie &ge;0,5% zgłoszone do rejestru KNF
    </p>
  </div>
);

const FilingCalendarCard: FC = () => (
  <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-border-custom shadow-xs flex flex-col justify-between">
    <div>
      <div className="flex items-center justify-between pb-3 border-b border-border-custom/40">
        <span className="text-xs font-black uppercase tracking-wider text-text-muted">
          Kalendarz ujawnień
        </span>
      </div>

      <div className="mt-3 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <span className="font-mono text-xs font-bold text-primary shrink-0 mt-0.5">
              14 LIS
            </span>
            <p className="text-xs text-text-secondary leading-snug">
              Fundusze 13F: nieprzekraczalny termin zgłoszenia za kwartał.
            </p>
          </div>
          <span className="text-3xs font-mono font-bold text-text-muted shrink-0">
            SEC
          </span>
        </div>

        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <span className="font-mono text-xs font-bold text-primary shrink-0 mt-0.5">
              10 LIS
            </span>
            <p className="text-xs text-text-secondary leading-snug">
              Kongres: nieprzekraczalny termin ujawnienia transakcji zawartej dziś.
            </p>
          </div>
          <span className="text-3xs font-mono font-bold text-text-muted shrink-0">
            STOCK ACT
          </span>
        </div>

        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <span className="font-mono text-xs font-bold text-success shrink-0 mt-0.5">
              22 WRZ
            </span>
            <p className="text-xs text-text-secondary leading-snug">
              Najnowsze ujawnienie STOCK Act w danych: Sheri Biggs — —.
            </p>
          </div>
          <span className="text-3xs font-mono font-bold text-text-muted shrink-0">
            DANE
          </span>
        </div>
      </div>
    </div>

    <p className="text-3xs text-text-muted pt-3 border-t border-border-custom/30 mt-3">
      Oficjalne terminy regulacyjne SEC EDGAR oraz U.S. House & Senate
    </p>
  </div>
);

export const DashboardBottomCards: FC<Props> = ({
  topConvergence,
  topGpwShorts = [],
  onNavigateTab,
}) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
    <ConvergenceUsaCard items={topConvergence} onNavigateTab={onNavigateTab} />
    <GpwShortsCard items={topGpwShorts} onNavigateTab={onNavigateTab} />
    <FilingCalendarCard />
  </div>
);
