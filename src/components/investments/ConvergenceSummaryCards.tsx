import { FC } from 'react';
import { CONVERGENCE_ITEMS, ConvergenceItem } from '../../lib/investments/investors13FData';
import Button from '../ui/Button';

interface Props {
  onNavigateTab: (tab: string) => void;
}

export const ConvergenceSummaryCards: FC<Props> = ({ onNavigateTab }) => {
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
          <span className="px-2 py-0.5 rounded-full text-3xs font-bold bg-success/15 text-success border border-success/30">
            100% Free
          </span>
        </div>

        <div className="space-y-2">
          {CONVERGENCE_ITEMS.slice(0, 3).map((item: ConvergenceItem) => (
            <div
              key={item.ticker}
              className="p-3 rounded-2xl bg-surface border border-border-custom/60 flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-xs text-text-primary">
                    ${item.ticker}
                  </span>
                  <span className="text-2xs text-text-secondary">{item.companyName}</span>
                </div>
                <div className="text-3xs text-text-muted mt-0.5">
                  Kupno: {item.superinvestorsCount} funduszy 13F + {item.politiciansCount} polityków
                </div>
              </div>
              <span className="font-mono text-sm font-black text-success tabular-nums">
                +{item.consensusScore}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Zbieżność GPW */}
      <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-border-custom shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-border-custom/40">
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-danger">
              Zbieżność GPW: Insider Kupuje + Short Spada
            </div>
            <p className="text-2xs text-text-secondary">
              Najsilniejszy sygnał akumulacji na polskim rynku:
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onNavigateTab('gpw_shorts')}
            className="text-xs text-primary"
          >
            Szorty KNF →
          </Button>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border-custom/50 text-center py-6">
          <span className="text-2xl block mb-1">🎯</span>
          <div className="text-xs font-bold text-text-primary">Brak zbieżnego sygnału dziś</div>
          <p className="text-2xs text-text-secondary max-w-xs mx-auto mt-1">
            Gdy członek zarządu kupi akcje spółki, na której fundusze redukują krótkie pozycje (np. JSW, ALE, DNP), natychmiast pojawi się tu alert.
          </p>
        </div>
      </div>
    </div>
  );
};
