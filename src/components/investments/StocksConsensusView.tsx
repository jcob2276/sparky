import { FC, useState, useEffect } from 'react';
import Button from '../ui/Button';
import { Download } from 'lucide-react';
import { notify } from '../../lib/notify';
import { StocksConsensusTable, StockConsensusItem } from './StocksConsensusTable';
import { fetchLiveConsensus } from '../../lib/investments/superinvestorsApi';

export const StocksConsensusView: FC = () => {
  const [filterType, setFilterType] = useState<'all' | 'accumulation' | 'distribution'>('all');
  const [consensusList, setConsensusList] = useState<StockConsensusItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const live = await fetchLiveConsensus();
        if (!active) return;
        setConsensusList(live.map((item) => ({
          ticker: item.ticker,
          name: item.name,
          sector: 'SEC 13F',
          priceUsd: null,
          changeToday: null,
          fundsBuying: item.buyers,
          fundsSelling: item.sellers,
          totalFunds: item.totalFunds,
          totalValueUsd: item.totalValueUsd,
          netScore: item.netScore,
          movementType: item.movementType,
        })));
      } catch {
        if (active) setConsensusList([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const filtered = consensusList.filter((item) => {
    if (filterType === 'accumulation') return item.netScore > 0;
    if (filterType === 'distribution') return item.netScore < 0;
    return true;
  });

  const handleExportCsv = () => {
    const headers = 'Ticker,Spółka,Sektor,Kurs_USD,Zmiana_Dziś_%,Kupuje_Funduszy,Sprzedaje_Funduszy,Wartość_USD,Wynik_Netto\n';
    const rows = filtered
      .map(
        (s) =>
          `"${s.ticker}","${s.name}","${s.sector}","${s.priceUsd}","${s.changeToday}","${s.fundsBuying}","${s.fundsSelling}","${s.totalValueUsd}","${s.netScore}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `screener_13f_konsensus_${new Date().getFullYear()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notify('Wyeksportowano screener 13F do CSV!', 'success');
  };

  return (
    <div className="space-y-6 animate-fade-in text-text-primary">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-surface border border-border-custom shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border-custom/50">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-md text-2xs font-bold bg-primary/10 text-primary border border-primary/20">
                Konsensus Instytucjonalny 13F
              </span>
              <span className="text-2xs font-mono text-text-secondary">
                Kwartał Q3 · SEC EDGAR
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">
              Screener Spółek: Akumulacja vs Dystrybucja
            </h2>
            <p className="text-xs text-text-secondary mt-1.5 max-w-3xl leading-relaxed">
              Ranking tickera po tickerze: kto dokupuje, kto redukuje, ile funduszy trzyma pozycję i gdzie pojawia się nietypowa aktywność w najnowszych formularzach SEC 13F.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 shrink-0">
            <div className="p-3.5 rounded-2xl bg-surface border border-border-custom/70 text-right shadow-xs">
              <div className="text-2xs text-success font-medium">Top Akumulacja</div>
              <div className="text-lg font-black text-success font-mono mt-0.5">
                {consensusList.find((item) => item.netScore > 0)
                  ? `${[...consensusList].sort((a, b) => b.netScore - a.netScore)[0]?.ticker} (${[...consensusList].sort((a, b) => b.netScore - a.netScore)[0]?.netScore})`
                  : '—'}
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-surface border border-border-custom/70 text-right shadow-xs">
              <div className="text-2xs text-danger font-medium">Top Dystrybucja</div>
              <div className="text-lg font-black text-danger font-mono mt-0.5">
                {consensusList.some((item) => item.netScore < 0)
                  ? `${[...consensusList].sort((a, b) => a.netScore - b.netScore)[0]?.ticker} (${[...consensusList].sort((a, b) => a.netScore - b.netScore)[0]?.netScore})`
                  : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between gap-2 mt-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant={filterType === 'all' ? 'primary' : 'secondary'}
              onClick={() => setFilterType('all')}
              className="rounded-xl text-xs"
            >
              Wszystkie ({loading ? '…' : consensusList.length})
            </Button>
            <Button
              size="sm"
              variant={filterType === 'accumulation' ? 'primary' : 'secondary'}
              onClick={() => setFilterType('accumulation')}
              className="rounded-xl text-xs"
            >
              🟢 Akumulacja (Kupowane)
            </Button>
            <Button
              size="sm"
              variant={filterType === 'distribution' ? 'primary' : 'secondary'}
              onClick={() => setFilterType('distribution')}
              className="rounded-xl text-xs"
            >
              🔴 Dystrybucja (Sprzedawane)
            </Button>
          </div>

          <Button
            size="sm"
            variant="secondary"
            icon={<Download size={13} />}
            onClick={handleExportCsv}
            className="rounded-xl text-xs font-semibold"
          >
            Eksportuj CSV
          </Button>
        </div>
      </div>

      {/* Screener Table Subcomponent */}
      <StocksConsensusTable stocks={filtered} />
    </div>
  );
};
