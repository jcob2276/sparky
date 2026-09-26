import { FC, useEffect, useState, useId } from 'react';
import Button from '../ui/Button';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { orcaSelect } from '../../lib/investments/superinvestorsApi';

interface Props {
  watchlist: string[];
  onNavigateToWatchlist: () => void;
}

interface RawDailyPrice {
  ticker?: string;
  date?: string;
  close_raw?: number;
}

interface IndexResult {
  dates: string[];
  values: number[];
  totalReturn: number;
}

function computeEqualWeightSeries(
  watchlist: string[],
  prices: RawDailyPrice[]
): IndexResult | null {
  if (!prices || prices.length === 0) return null;

  const dateMap = new Map<string, Map<string, number>>();
  for (const p of prices) {
    if (!p.date || !p.ticker || p.close_raw == null || p.close_raw <= 0) continue;
    const byTicker = dateMap.get(p.date) || new Map<string, number>();
    byTicker.set(p.ticker.toUpperCase(), p.close_raw);
    dateMap.set(p.date, byTicker);
  }

  const sortedDates = Array.from(dateMap.keys()).sort();
  if (sortedDates.length < 2) return null;

  const basePrices = new Map<string, number>();
  for (const ticker of watchlist) {
    const sym = ticker.toUpperCase();
    for (const d of sortedDates) {
      const p = dateMap.get(d)?.get(sym);
      if (p != null) {
        basePrices.set(sym, p);
        break;
      }
    }
  }

  const values = sortedDates.map((d) => {
    const dayPrices = dateMap.get(d)!;
    let sumRel = 0;
    let count = 0;
    for (const ticker of watchlist) {
      const sym = ticker.toUpperCase();
      const curr = dayPrices.get(sym);
      const base = basePrices.get(sym);
      if (curr != null && base != null && base > 0) {
        sumRel += curr / base;
        count++;
      }
    }
    return count > 0 ? (sumRel / count) * 100 : 100;
  });

  const startVal = values[0] || 100;
  const endVal = values[values.length - 1] || 100;
  const totalReturn = Number((((endVal - startVal) / startVal) * 100).toFixed(2));

  return { dates: sortedDates, values, totalReturn };
}

export const DashboardEqualWeightChart: FC<Props> = ({
  watchlist,
  onNavigateToWatchlist,
}) => {
  const [chartData, setChartData] = useState<IndexResult | null>(null);
  const [loading, setLoading] = useState(false);
  const gradientId = useId();

  useEffect(() => {
    if (watchlist.length === 0) return;

    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      const encTickers = watchlist.map((t) => encodeURIComponent(t.toUpperCase())).join(',');

      orcaSelect<RawDailyPrice>(
        `prices_daily?ticker=in.(${encTickers})&order=date.desc&limit=${watchlist.length * 30}`
      )
        .then((prices) => {
          if (!active) return;
          setChartData(computeEqualWeightSeries(watchlist, prices));
        })
        .catch(() => {
          if (active) setChartData(null);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [watchlist]);

  const effectiveData = watchlist.length === 0 ? null : chartData;
  const isEmpty = watchlist.length === 0;

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-border-custom shadow-xs flex flex-col justify-between h-full min-h-72">
      <div className="flex items-center justify-between pb-3 border-b border-border-custom/40">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-text-muted">
            Watchlista - Indeks równych wag
          </span>
          {effectiveData && (
            <span
              className={`px-2 py-0.5 rounded-md text-2xs font-mono font-bold ${
                effectiveData.totalReturn >= 0
                  ? 'bg-success/10 text-success border border-success/20'
                  : 'bg-danger/10 text-danger border border-danger/20'
              }`}
            >
              {effectiveData.totalReturn >= 0 ? `+${effectiveData.totalReturn}%` : `${effectiveData.totalReturn}%`} (30D)
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
          <p className="text-xs text-text-secondary">Trwa synchronizacja notowań dla spółek z watchlisty.</p>
        </div>
      )}
    </div>
  );
};
