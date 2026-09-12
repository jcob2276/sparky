import { BarChart2, ArrowUpRight, TrendingDown, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../../ui/Card';
import { useCorrelationsQuery } from '../../../lib/correlationsApi';
import { rColor } from '@vanguard/domain';

export default function DesktopCorrelationsSummary({ userId }: { userId: string }) {
  const { data, isLoading } = useCorrelationsQuery(userId, false);

  const correlations = data?.correlations ?? [];

  // Filter significant correlations (r >= 0.25 or r <= -0.25)
  const topCorrelations = [...correlations]
    .filter((c) => Math.abs(c.r) >= 0.2)
    .sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
    .slice(0, 4);

  return (
    <Card variant="surface" padding="1.25rem" className="space-y-4 border-border-custom bg-surface/30">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
            <BarChart2 size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-text-primary">Korelacje Wielodomenowe</h3>
            <p className="text-xs text-text-muted">
              Matematyczne zależności przyczynowo-skutkowe: sen, ekran, kofeina, trening i regeneracja
            </p>
          </div>
        </div>
        <Link
          to="/korelacje"
          className="flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
        >
          <span>Skaner korelacji</span>
          <ArrowUpRight size={14} />
        </Link>
      </div>

      {isLoading ? (
        <div className="h-28 animate-pulse rounded-xl bg-border-custom/30" />
      ) : topCorrelations.length === 0 ? (
        <div className="rounded-xl border border-border-custom bg-background/40 p-4 text-center">
          <p className="text-xs text-text-muted">
            {correlations.length === 0
              ? 'Wymaga zebrania min. 14 dni zsynchronizowanych danych Oura, żywienia i ekranu.'
              : 'Brak silnych korelacji statystycznych w bieżącym oknie czasowym.'}
          </p>
          <Link to="/korelacje" className="mt-2 inline-flex text-xs font-semibold text-primary hover:underline">
            Zobacz szczegółową analizę korelacji →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {topCorrelations.map((item, idx) => {
            const isNegative = item.r < 0;
            const rVal = item.r.toFixed(2);
            return (
              <div
                key={idx}
                className="rounded-xl border border-border-custom bg-background/40 p-3 flex flex-col justify-between space-y-2 hover:border-border-focus transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-text-primary leading-snug">
                      {item.x_label || item.label} → {item.y_label}
                    </p>
                    <p className="text-3xs text-text-muted mt-0.5">
                      lag: {item.lag_days === 0 ? 'ten sam dzień' : `${item.lag_days}d opóźnienia`} · N={item.n}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className="rounded-md px-1.5 py-0.5 font-mono text-xs font-bold"
                      style={{ color: rColor(item.r) }}
                    >
                      r = {rVal}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border-custom/40 pt-1.5 text-2xs">
                  <span className="text-text-secondary flex items-center gap-1">
                    {isNegative ? (
                      <span className="flex items-center text-error"><TrendingDown size={12} className="mr-0.5" /> Ujemny wpływ</span>
                    ) : (
                      <span className="flex items-center text-success"><TrendingUp size={12} className="mr-0.5" /> Dodatni wpływ</span>
                    )}
                  </span>
                  <span className="rounded-full bg-surface-solid px-2 py-0.5 text-3xs font-semibold text-text-muted">
                    {item.confidence === 'solid' ? 'Pewny' : item.confidence === 'building' ? 'Sygnał' : 'Hipoteza'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
