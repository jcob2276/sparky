import { FC, useState } from 'react';
import Button from '../ui/Button';
import { Download } from 'lucide-react';
import { notify } from '../../lib/notify';
import { StocksConsensusTable, StockConsensusItem } from './StocksConsensusTable';

const STOCKS_13F_CONSENSUS: StockConsensusItem[] = [
  { ticker: 'AMZN', name: 'Amazon.com Inc.', sector: 'Dobra konsumpcyjne', priceUsd: 249.38, changeToday: 0.04, fundsBuying: 12, fundsSelling: 8, totalFunds: 20, totalValueUsd: '$16.7 mld', netScore: 4, movementType: 'accumulation' },
  { ticker: 'NVDA', name: 'NVIDIA Corp.', sector: 'Technologia', priceUsd: 224.58, changeToday: -0.41, fundsBuying: 4, fundsSelling: 6, totalFunds: 10, totalValueUsd: '$99.6 mld', netScore: -2, movementType: 'distribution' },
  { ticker: 'AAPL', name: 'Apple Inc.', sector: 'Technologia', priceUsd: 335.92, changeToday: -0.33, fundsBuying: 2, fundsSelling: 1, totalFunds: 3, totalValueUsd: '$51.4 mld', netScore: 1, movementType: 'accumulation' },
  { ticker: 'GOOGL', name: 'Alphabet Inc. Class A', sector: 'Technologia', priceUsd: 342.36, changeToday: 1.34, fundsBuying: 3, fundsSelling: 8, totalFunds: 11, totalValueUsd: '$33.9 mld', netScore: -5, movementType: 'distribution' },
  { ticker: 'MSFT', name: 'Microsoft Corp.', sector: 'Technologia', priceUsd: 497.93, changeToday: -0.53, fundsBuying: 3, fundsSelling: 7, totalFunds: 10, totalValueUsd: '$69.6 mld', netScore: -4, movementType: 'distribution' },
  { ticker: 'TSM', name: 'Taiwan Semiconductor', sector: 'Technologia', priceUsd: 451.15, changeToday: 1.03, fundsBuying: 7, fundsSelling: 6, totalFunds: 13, totalValueUsd: '$14.2 mld', netScore: 1, movementType: 'accumulation' },
  { ticker: 'AVGO', name: 'Broadcom Inc.', sector: 'Technologia', priceUsd: 350.36, changeToday: -1.30, fundsBuying: 0, fundsSelling: 3, totalFunds: 3, totalValueUsd: '$740 mln', netScore: -3, movementType: 'distribution' },
  { ticker: 'META', name: 'Meta Platforms Inc.', sector: 'Technologia', priceUsd: 777.59, changeToday: 4.50, fundsBuying: 5, fundsSelling: 6, totalFunds: 11, totalValueUsd: '$10.7 mld', netScore: -1, movementType: 'distribution' },
  { ticker: 'AMAT', name: 'Applied Materials', sector: 'Technologia', priceUsd: 474.25, changeToday: -0.03, fundsBuying: 4, fundsSelling: 1, totalFunds: 5, totalValueUsd: '$3.6 mld', netScore: 3, movementType: 'accumulation' },
  { ticker: 'CRH', name: 'CRH PLC', sector: 'Materiały', priceUsd: 102.40, changeToday: 0.85, fundsBuying: 3, fundsSelling: 0, totalFunds: 3, totalValueUsd: '$2.1 mld', netScore: 3, movementType: 'accumulation' },
  { ticker: 'NBIS', name: 'Nebius Group N.V.', sector: 'Technologia / AI', priceUsd: 28.50, changeToday: 2.10, fundsBuying: 3, fundsSelling: 0, totalFunds: 3, totalValueUsd: '$850 mln', netScore: 3, movementType: 'accumulation' },
  { ticker: 'ALAB', name: 'Astera Labs Inc.', sector: 'Półprzewodniki AI', priceUsd: 72.10, changeToday: 3.45, fundsBuying: 2, fundsSelling: 0, totalFunds: 2, totalValueUsd: '$420 mln', netScore: 2, movementType: 'accumulation' },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Finanse', priceUsd: 338.56, changeToday: 0.31, fundsBuying: 1, fundsSelling: 0, totalFunds: 1, totalValueUsd: '$949 mln', netScore: 1, movementType: 'accumulation' },
  { ticker: 'BAC', name: 'Bank of America', sector: 'Finanse', priceUsd: 56.03, changeToday: 0.05, fundsBuying: 0, fundsSelling: 2, totalFunds: 2, totalValueUsd: '$17.6 mld', netScore: -2, movementType: 'distribution' },
];

export const StocksConsensusView: FC = () => {
  const [filterType, setFilterType] = useState<'all' | 'accumulation' | 'distribution'>('all');

  const filtered = STOCKS_13F_CONSENSUS.filter((item) => {
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
              <div className="text-lg font-black text-success font-mono mt-0.5">AMZN (+4)</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-surface border border-border-custom/70 text-right shadow-xs">
              <div className="text-2xs text-danger font-medium">Top Dystrybucja</div>
              <div className="text-lg font-black text-danger font-mono mt-0.5">GOOGL (-5)</div>
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
              Wszystkie ({STOCKS_13F_CONSENSUS.length})
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
