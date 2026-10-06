import { useEffect, useState } from 'react';
import { fetchEnrichedConsensus, type EnrichedStockConsensus, type ConsensusStats } from './consensusService';

const initialStats: ConsensusStats = {
  totalCompanies: 0, totalMoves: 0, topBoughtTicker: '—', topBoughtNet: 0,
  topSoldTicker: '—', topSoldNet: 0, mostActiveTicker: '—', mostActiveMoves: 0,
  reportPeriod: null, previousPeriod: null,
};

export function useStocksConsensus() {
  const [consensusList, setList] = useState<EnrichedStockConsensus[]>([]);
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    fetchEnrichedConsensus().then(data => {
      if (active) { setList(data.items); setStats(data.stats); }
    }).catch(() => {
      if (active) setError('Nie udało się pobrać zweryfikowanych raportów SEC. Odśwież widok, aby spróbować ponownie.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return { consensusList, stats, loading, error };
}
