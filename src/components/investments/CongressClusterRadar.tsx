import { FC } from 'react';
import { CompanyLogo } from './CompanyLogo';
import { PoliticianAvatar } from './PoliticianAvatar';
import type { ClusterBuyAlert } from '../../lib/investments/congressClusterService';
import { Radio, Users, Sparkles } from 'lucide-react';

interface Props {
  clusterBuys: ClusterBuyAlert[];
  onSelectStock: (ticker: string) => void;
  onSelectPolitician: (name: string) => void;
}

export const CongressClusterRadar: FC<Props> = ({
  clusterBuys,
  onSelectStock,
  onSelectPolitician,
}) => {
  if (!clusterBuys || clusterBuys.length === 0) return null;

  const formatVol = (val: number) => {
    if (val >= 1e6) return `${(val / 1e6).toFixed(1).replace('.', ',')} mln USD`;
    if (val >= 1e3) return `${(val / 1e3).toFixed(1).replace('.', ',')} tys USD`;
    return `${val.toLocaleString()} USD`;
  };

  // Show top 6 cluster buys
  const topClusters = clusterBuys.slice(0, 6);

  return (
    <div className="bg-surface-elevated border border-border-custom rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border-custom/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Radio size={16} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-text-primary tracking-tight">
                Radar Zbieżności Kongresu · Cluster Buys
              </h3>
              <span className="px-1.5 py-0.5 rounded text-4xs font-mono font-bold bg-primary/15 text-primary border border-primary/30">
                LIVE
              </span>
            </div>
            <p className="text-3xs text-text-muted mt-0.5">
              Spółki kupowane przez ≥2 polityków w tym samym oknie czasowym. Najsilniejsza zbieżność transakcyjna.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-3xs font-mono text-text-muted">
          <Users size={12} className="text-primary" />
          <span>Wykryto {clusterBuys.length} klastrów</span>
        </div>
      </div>

      {/* Grid of Clusters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {topClusters.map((cluster) => (
          <div
            key={cluster.ticker}
            className="p-3 rounded-xl bg-surface border border-border-custom hover:border-primary/40 transition-all flex flex-col justify-between space-y-3 group"
          >
            {/* Top row: Ticker, Logo, Bipartisan badge */}
            <div className="flex items-start justify-between gap-2">
              <div
                onClick={() => onSelectStock(cluster.ticker)}
                className="flex items-center gap-2.5 cursor-pointer min-w-0"
              >
                <CompanyLogo ticker={cluster.ticker} name={cluster.companyName} size={32} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-black text-text-primary group-hover:text-primary transition-colors">
                      ${cluster.ticker}
                    </span>
                    {cluster.isBipartisan && (
                      <span
                        className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-4xs font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30"
                        title="Ponadpartyjny klaster: Kupują zarówno Demokraci jak i Republikanie!"
                      >
                        <Sparkles size={9} />
                        Bipartisan
                      </span>
                    )}
                  </div>
                  <div className="text-3xs text-text-muted truncate max-w-40">
                    {cluster.companyName}
                  </div>
                </div>
              </div>

              {/* Politician count & total vol */}
              <div className="text-right shrink-0">
                <div className="text-xs font-mono font-bold text-success">
                  {cluster.buyerCount} kupujących
                </div>
                <div className="text-4xs font-mono text-text-muted">
                  {formatVol(cluster.totalVolumeUsd)}
                </div>
              </div>
            </div>

            {/* Buyers chips */}
            <div className="pt-2 border-t border-border-custom/40 flex flex-wrap gap-1.5">
              {cluster.buyers.map((b) => (
                <div
                  key={b.id}
                  onClick={() => onSelectPolitician(b.name)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onSelectPolitician(b.name);
                  }}
                  className="cursor-pointer inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-surface-elevated hover:bg-surface-subtle border border-border-custom text-4xs transition-colors"
                  title={`${b.name} (${b.party}-${b.state}) · ${formatVol(b.volumeUsd)}`}
                >
                  <PoliticianAvatar name={b.name} bioguideId={b.bioguideId} size={14} />
                  <span className="font-semibold text-text-primary truncate max-w-24">
                    {b.name}
                  </span>
                  <span
                    className={`font-mono font-bold ${
                      b.party === 'D' ? 'text-primary' : 'text-danger'
                    }`}
                  >
                    ({b.party})
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
