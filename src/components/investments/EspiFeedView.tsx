import { FC, useState, useEffect } from 'react';
import {
  GpwInsiderKpis,
  GpwInsiderCluster,
  GpwInsiderEffectiveness,
  fetchGpwInsidersKpis,
  fetchGpwInsiderClusters,
  fetchGpwInsiderEffectiveness,
} from '../../lib/investments/gpwInsidersService';
import { GpwInsidersHeader } from './GpwInsidersHeader';
import { GpwInsidersHeatmap } from './GpwInsidersHeatmap';
import { GpwInsidersClustersTable } from './GpwInsidersClustersTable';
import { GpwInsidersPerformanceTable } from './GpwInsidersPerformanceTable';
import { GpwInsidersLiveFeed } from './GpwInsidersLiveFeed';

interface Props {
  onNavigateTab?: (tab: string) => void;
}

const DEFAULT_KPIS: GpwInsiderKpis = {
  purchases: 486,
  sales: 483,
  market90dPurchases: 616,
  market90dSales: 768,
  marketDeltaPoints: '+5.6 pkt',
  mostActiveTicker: 'BUMECH',
  mostActiveCount: 211,
  medianPerCompany: 3,
  tempo30d: 935,
  tempoAvg90d: 461,
  tempoGrowthPct: '+103%',
};

export const EspiFeedView: FC<Props> = ({ onNavigateTab }) => {
  const [kpis, setKpis] = useState<GpwInsiderKpis>(DEFAULT_KPIS);
  const [clusters, setClusters] = useState<GpwInsiderCluster[]>([]);
  const [effectiveness, setEffectiveness] = useState<GpwInsiderEffectiveness[]>([]);

  useEffect(() => {
    let active = true;

    Promise.all([
      fetchGpwInsidersKpis(),
      fetchGpwInsiderClusters(),
      fetchGpwInsiderEffectiveness(),
    ]).then(([nextKpis, nextClusters, nextEff]) => {
      if (!active) return;
      setKpis(nextKpis);
      setClusters(nextClusters);
      setEffectiveness(nextEff);
    });

    return () => {
      active = false;
    };
  }, []);

  const handleSelectTicker = (ticker: string) => {
    // When clicking a ticker, navigate to GPW portfolio/details view if available
    onNavigateTab?.(`company_${ticker}`);
  };

  return (
    <div className="space-y-6 animate-fade-in text-text-primary pb-12">
      {/* 1. Header with 3 sub-tabs and top 3 KPI cards */}
      <GpwInsidersHeader kpis={kpis} onNavigateTab={onNavigateTab} />

      {/* 2. 90-day purchase intensity distribution */}
      <GpwInsidersHeatmap />

      {/* 3. 90-day clusters table with 100% unlocked insider names */}
      <GpwInsidersClustersTable
        clusters={clusters}
        onSelectTicker={handleSelectTicker}
      />

      {/* 4. Historical effectiveness table with unblurred median and alpha */}
      <GpwInsidersPerformanceTable
        data={effectiveness}
        onSelectTicker={handleSelectTicker}
      />

      {/* 5. Live feed of MAR art. 19 announcements (replacing paywall) */}
      <GpwInsidersLiveFeed onSelectTicker={handleSelectTicker} />
    </div>
  );
};
