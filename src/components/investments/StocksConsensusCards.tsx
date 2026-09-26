import { FC } from 'react';
import { ConsensusStats } from '../../lib/investments/consensusService';

interface Props {
  stats: ConsensusStats;
  loading: boolean;
}

export const StocksConsensusCards: FC<Props> = ({ stats, loading }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* Spółek */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border-custom shadow-xs flex flex-col justify-between">
        <div className="text-3xs uppercase tracking-wider font-semibold text-text-secondary">
          Spółek
        </div>
        <div className="text-2xl sm:text-3xl font-black text-text-primary font-mono mt-2">
          {loading ? '…' : stats.totalCompanies}
        </div>
      </div>

      {/* Ruchów łącznie */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border-custom shadow-xs flex flex-col justify-between">
        <div className="text-3xs uppercase tracking-wider font-semibold text-text-secondary">
          Ruchów łącznie
        </div>
        <div className="text-2xl sm:text-3xl font-black text-text-primary font-mono mt-2">
          {loading ? '…' : stats.totalMoves}
        </div>
      </div>

      {/* Najmocniej kupowane */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border-custom shadow-xs flex flex-col justify-between">
        <div className="text-3xs uppercase tracking-wider font-semibold text-text-secondary">
          Najmocniej kupowane
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xl sm:text-2xl font-black text-success font-mono">
            {stats.topBoughtTicker}
          </span>
          <span className="text-xs font-mono text-text-secondary">
            netto +{stats.topBoughtNet}
          </span>
        </div>
      </div>

      {/* Najmocniej sprzedawane */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border-custom shadow-xs flex flex-col justify-between">
        <div className="text-3xs uppercase tracking-wider font-semibold text-text-secondary">
          Najmocniej sprzedawane
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xl sm:text-2xl font-black text-danger font-mono">
            {stats.topSoldTicker}
          </span>
          <span className="text-xs font-mono text-text-secondary">
            netto {stats.topSoldNet}
          </span>
        </div>
      </div>
    </div>
  );
};
