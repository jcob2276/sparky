import { FC, useId } from 'react';
import Button from '../ui/Button';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { useDashboardIndex } from '../../lib/investments/dashboardIndex';

interface Props {
  watchlist: string[];
  onNavigateToWatchlist: () => void;
}

export const DashboardEqualWeightChart: FC<Props> = ({
  watchlist,
  onNavigateToWatchlist,
}) => {
  const query = useDashboardIndex(watchlist);
  const gradientId = useId();
  const loading = query.isPending && watchlist.length > 0;
  const effectiveData = query.data ?? null;
  const isEmpty = watchlist.length === 0;

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-border-custom shadow-xs flex flex-col justify-between h-full min-h-72">
      <div className="flex items-center justify-between pb-3 border-b border-border-custom/40">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-text-muted">
            Watchlista · indeks cen równych wag
          </span>
          {effectiveData && (
            <span
              className={`px-2 py-0.5 rounded-md text-2xs font-mono font-bold ${
                effectiveData.totalReturn >= 0
                  ? 'bg-success/10 text-success border border-success/20'
                  : 'bg-danger/10 text-danger border border-danger/20'
              }`}
            >
              {effectiveData.totalReturn >= 0 ? `+${effectiveData.totalReturn}%` : `${effectiveData.totalReturn}%`} (dostępny okres)
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onNavigateToWatchlist}
          icon={<ArrowRight size={13} />}
          iconPosition="right"
          className="text-xs font-semibold text-primary"
        >
          Przejdź do watchlisty
        </Button>
      </div>

      <p className="text-3xs text-text-muted">Ceny surowe w walutach lokalnych, bez dywidend, korekt splitów i przeliczenia FX. Wyłącznie wspólne daty wszystkich spółek; to nie wynik portfela.</p>
      {/* Main Area */}
      {isEmpty ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
          <p className="text-xs text-text-secondary max-w-sm">
            Dodaj spółki do watchlisty, żeby zobaczyć tu ich wspólny indeks.
          </p>
          <Button
            size="sm"
            variant="tonal"
            onClick={onNavigateToWatchlist}
            className="mt-3 rounded-xl text-xs font-semibold"
          >
            <span>Przejdź do watchlisty</span>
            <ArrowRight size={13} className="ml-1" />
          </Button>
        </div>
      ) : loading ? (
        <div className="flex-1 flex items-center justify-center py-12">
          <span className="text-xs text-text-secondary font-mono">Liczenie indeksu równych wag...</span>
        </div>
      ) : effectiveData ? (
        <div className="flex-1 flex flex-col justify-end pt-4">
          <div className="h-44 w-full">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150" preserveAspectRatio="none">
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {(() => {
                const vals = effectiveData.values;
                const min = Math.min(...vals);
                const max = Math.max(...vals);
                const range = max - min || 1;
                const pts = vals.map((v, i) => {
                  const x = (i / (vals.length - 1)) * 500;
                  const y = 140 - ((v - min) / range) * 120;
                  return `${x.toFixed(1)},${y.toFixed(1)}`;
                });
                const dPath = `M ${pts.join(' L ')}`;
                const areaPath = `${dPath} L 500,150 L 0,150 Z`;

                return (
                  <>
                    <path d={areaPath} fill={`url(#${gradientId})`} />
                    <path
                      d={dPath}
                      fill="none"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="stroke-primary"
                    />
                  </>
                );
              })()}
            </svg>
          </div>
          <div className="flex justify-between items-center text-3xs font-mono text-text-muted pt-2 border-t border-border-custom/30 mt-2">
            <span>{effectiveData.dates[0]}</span>
            <span className="flex items-center gap-1 font-semibold text-text-primary">
              <TrendingUp size={12} className="text-primary" /> Indeks bazowy 100 pkt
            </span>
            <span>{effectiveData.dates[effectiveData.dates.length - 1]}</span>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
          <p className="text-xs text-text-secondary">{query.error ? "Błąd odczytu cen. Spróbuj odświeżyć." : "Brak dwóch wspólnych dat notowań dla całej watchlisty."}</p>
        </div>
      )}
    </div>
  );
};
