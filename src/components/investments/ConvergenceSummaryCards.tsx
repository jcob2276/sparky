import { FC } from 'react';
import Button from '../ui/Button';
import { useSignalBoard } from './useSignalBoard';
import { ConvergenceGpwCard } from './ConvergenceGpwCard';

interface Props {
  onNavigateTab: (tab: string) => void;
}

export const ConvergenceSummaryCards: FC<Props> = ({ onNavigateTab }) => {
  const { rows, loading } = useSignalBoard('90d');
  const top = rows.filter((row) => row.convergent).slice(0, 3);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Top Zbieżność USA */}
      <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-border-custom shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-border-custom/40">
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-primary">
              Top Zbieżność USA (13F + STOCK Act)
            </div>
            <p className="text-2xs text-text-secondary">
              Fundusze i politycy kupują te same akcje:
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => onNavigateTab('convergence')} className="text-xs text-primary">
            Sygnały →
          </Button>
        </div>

        <div className="space-y-2">
          {loading && <p className="text-xs text-text-muted">Liczenie zbieżności…</p>}
          {!loading && top.length === 0 && (
            <p className="text-xs text-text-secondary">Brak zbieżnych kupn funduszy i polityków w oknie 90 dni.</p>
          )}
          {top.map((item) => (
            <div
              key={item.ticker}
              className="p-3 rounded-2xl bg-surface border border-border-custom/60 flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-xs text-text-primary">
                    {item.ticker}
                  </span>
                  <span className="text-2xs text-text-secondary">{item.companyName}</span>
                </div>
                <div className="text-3xs text-text-muted mt-0.5">
                  {item.fundNetBuyers} funduszy netto · {item.polBuys} kupn polityków
                </div>
              </div>
              <span className="font-mono text-sm font-black text-success tabular-nums">
                {item.score}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Zbieżność GPW */}
      <ConvergenceGpwCard onNavigateTab={onNavigateTab} />
    </div>
  );
};
