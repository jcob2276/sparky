import { FC, useState } from 'react';
import { InsiderTradeItem } from '../../lib/investments/investmentsApi';
import { InvestmentsCard } from './InvestmentsCard';
import Button from '../ui/Button';

interface Props {
  allTrades: InsiderTradeItem[];
}

interface ClusterGroup {
  ticker: string;
  assetName: string;
  buysCount: number;
  totalVolumeEst: number;
  filers: string[];
  trades: InsiderTradeItem[];
  isPolish: boolean;
}

export const ClustersRankingView: FC<Props> = ({ allTrades }) => {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  // Group buys by ticker
  const map = new Map<string, ClusterGroup>();

  for (const t of allTrades) {
    if (!t.ticker) continue;
    const isBuy = (t.transaction_type || '').toLowerCase().includes('buy') || (t.transaction_type || '').toLowerCase().includes('purchase');
    if (!isBuy) continue;

    const existing = map.get(t.ticker) || {
      ticker: t.ticker,
      assetName: t.asset_name || t.ticker,
      buysCount: 0,
      totalVolumeEst: 0,
      filers: [],
      trades: [],
      isPolish: t.state === 'PL' || t.branch === 'gpw_mar',
    };

    existing.buysCount += 1;
    existing.totalVolumeEst += t.amount_high || t.amount_low || 100000;
    if (!existing.filers.includes(t.filer_name)) {
      existing.filers.push(t.filer_name);
    }
    existing.trades.push(t);
    map.set(t.ticker, existing);
  }

  const clusters = Array.from(map.values())
    .sort((a, b) => b.buysCount - a.buysCount || b.totalVolumeEst - a.totalVolumeEst);

  const activeGroup = selectedTicker ? map.get(selectedTicker) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Clusters Header Info */}
      <div className="p-6 rounded-3xl bg-surface border border-border-custom shadow-xs">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">🔥</span>
          <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">
            Klastry Zakupowe (Smart Money Consensus)
          </h2>
        </div>
        <p className="text-sm text-text-secondary max-w-3xl leading-normal">
          Badania quantowe dowodzą, że gdy <strong>dwóch lub więcej insiderów</strong> kupuje ten sam ticker w zbliżonym czasie, wskaźnik wygranych transakcji wzrasta o ponad 30%. Oto spółki o najwyższej koncentracji kapitału na Wall Street i GPW.
        </p>
      </div>

      {/* Tickers Ranking Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {clusters.slice(0, 12).map((group, rank) => {
          const isSelected = selectedTicker === group.ticker;
          return (
            <div
              key={group.ticker}
              onClick={() => setSelectedTicker(isSelected ? null : group.ticker)}
              className={`p-4 rounded-2xl bg-surface border cursor-pointer transition-shadow shadow-xs hover:shadow-md ${
                isSelected
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-border-custom/70 hover:border-primary/50'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black font-mono text-text-muted">#{rank + 1}</span>
                  <span className="px-2 py-0.5 rounded-md bg-surface border border-border-custom text-text-primary font-mono font-bold text-xs">
                    {group.isPolish ? `${group.ticker}.WA` : `$${group.ticker}`}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-md text-2xs font-bold bg-success/15 text-success border border-success/30">
                  {group.buysCount} {group.buysCount === 1 ? 'zakup' : 'zakupy'}
                </span>
              </div>

              <div className="text-xs font-semibold text-text-primary truncate mb-1">
                {group.assetName}
              </div>

              <div className="text-2xs text-text-secondary truncate mb-3">
                Insiderzy: {group.filers.slice(0, 2).join(', ')}
                {group.filers.length > 2 ? ` +${group.filers.length - 2}` : ''}
              </div>

              <div className="flex items-center justify-between text-2xs text-text-secondary pt-2 border-t border-border-custom/40">
                <span>Wolumen szac.:</span>
                <strong className="text-text-primary font-mono tabular-nums">
                  {group.isPolish ? `${(group.totalVolumeEst / 1000000).toFixed(1)}M PLN` : `$${(group.totalVolumeEst / 1000000).toFixed(1)}M`}
                </strong>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Cluster Trades Breakdown */}
      {activeGroup && (
        <div className="mt-8 pt-6 border-t border-border-custom/50 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <span>🎯</span> Wszystkie transakcje dla tickera {activeGroup.ticker} ({activeGroup.trades.length})
            </h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedTicker(null)}
              className="text-xs"
            >
              ✕ Zamknij filtr
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeGroup.trades.map((t) => (
              <InvestmentsCard key={t.id} trade={t} isCluster={true} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
