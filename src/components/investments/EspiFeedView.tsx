import { FC, useEffect, useMemo, useState } from 'react';
import { fetchGpwInsiderNoticesYtd, type GpwInsiderNotice } from '../../lib/investments/gpwInsidersService';
import {
  computeGpwInsiderClusters,
  computeGpwInsiderDailyCells,
  computeGpwInsiderKpis,
} from '../../lib/investments/gpwInsidersStats';
import { getTodayWarsaw } from '../../lib/date';
import { yearFloor } from '../../lib/investments/yearFloor';
import Skeleton from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import { GpwInsidersHeader } from './GpwInsidersHeader';
import { GpwInsidersHeatmap } from './GpwInsidersHeatmap';
import { GpwInsidersClustersTable } from './GpwInsidersClustersTable';
import { GpwInsidersLiveFeed } from './GpwInsidersLiveFeed';

interface Props {
  onNavigateTab?: (tab: string) => void;
}

export const EspiFeedView: FC<Props> = ({ onNavigateTab }) => {
  const [notices, setNotices] = useState<GpwInsiderNotice[] | null>(null);
  const [failed, setFailed] = useState(false);
  const today = getTodayWarsaw();
  const floor = yearFloor(today);

  useEffect(() => {
    let active = true;
    fetchGpwInsiderNoticesYtd()
      .then((rows) => { if (active) setNotices(rows); })
      .catch(() => { if (active) { setFailed(true); setNotices([]); } });
    return () => { active = false; };
  }, []);

  const stats = useMemo(() => {
    if (!notices) return null;
    return {
      kpis: computeGpwInsiderKpis(notices, today, floor),
      clusters: computeGpwInsiderClusters(notices),
      cells: computeGpwInsiderDailyCells(notices, floor, today),
    };
  }, [notices, today, floor]);

  const handleSelectTicker = (ticker: string) => onNavigateTab?.(`company_${ticker}`);

  return (
    <div className="space-y-6 animate-fade-in text-text-primary pb-12">
      <GpwInsidersHeader kpis={stats?.kpis ?? null} floor={floor} onNavigateTab={onNavigateTab} />

      {!stats ? (
        <Skeleton variant="card" lines={4} />
      ) : failed ? (
        <EmptyState label="Nie udało się pobrać zawiadomień MAR" description="Spróbuj ponownie za chwilę. Nie pokazujemy danych zastępczych." />
      ) : notices && notices.length === 0 ? (
        <EmptyState
          label={`Brak zawiadomień MAR od 1 stycznia ${floor.slice(0, 4)}`}
          description="Baza trzyma tylko bieżący rok. Zawiadomienia pojawią się po pierwszym imporcie ESPI."
        />
      ) : (
        <>
          <GpwInsidersHeatmap cells={stats.cells} floor={floor} />
          <GpwInsidersClustersTable clusters={stats.clusters} onSelectTicker={handleSelectTicker} />
        </>
      )}

      <GpwInsidersLiveFeed onSelectTicker={handleSelectTicker} />
    </div>
  );
};
