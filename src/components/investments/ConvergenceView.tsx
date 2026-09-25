import { FC, useState } from 'react';
import Button from '../ui/Button';
import { notify } from '../../lib/notify';
import { Download, Copy, TrendingUp, ShieldAlert } from 'lucide-react';

interface ConvergenceItem {
  ticker: string;
  name: string;
  market: 'USA' | 'GPW';
  score: number;
  fundsDetails: string;
  politiciansDetails: string;
  shortDetails?: string;
  tradingviewUrl: string;
}

const CONVERGENCE_DATA: ConvergenceItem[] = [
  {
    ticker: 'AMZN',
    name: 'Amazon.com Inc.',
    market: 'USA',
    score: 4,
    fundsDetails: 'Warren Buffett (+5.2%) · Ray Dalio (+12.4%) · Scion Asset Mgmt',
    politiciansDetails: '1 transakcja kupna w Senacie USA ($250k–$500k)',
    tradingviewUrl: 'https://www.tradingview.com/symbols/AMZN/',
  },
  {
    ticker: 'NVDA',
    name: 'NVIDIA Corporation',
    market: 'USA',
    score: 3,
    fundsDetails: 'Bill Ackman (Pershing Square) · Stanley Druckenmiller',
    politiciansDetails: 'Nancy Pelosi (Opcje Call LEAPS Deep ITM $1M–$5M)',
    tradingviewUrl: 'https://www.tradingview.com/symbols/NVDA/',
  },
  {
    ticker: 'GOOGL',
    name: 'Alphabet Inc.',
    market: 'USA',
    score: 3,
    fundsDetails: 'Michael Burry (Scion) · Ray Dalio (Bridgewater)',
    politiciansDetails: 'Sheri Biggs ($500k–$1M) · Nancy Pelosi ($1M–$5M)',
    tradingviewUrl: 'https://www.tradingview.com/symbols/GOOGL/',
  },
  {
    ticker: 'AVGO',
    name: 'Broadcom Inc.',
    market: 'USA',
    score: 2,
    fundsDetails: 'Stanley Druckenmiller (Duquesne Family Office)',
    politiciansDetails: 'Richard W. Allen (Kongres, kupno 12 sie)',
    tradingviewUrl: 'https://www.tradingview.com/symbols/AVGO/',
  },
  {
    ticker: 'DNP',
    name: 'Dino Polska S.A.',
    market: 'GPW',
    score: 2,
    fundsDetails: 'Zwiększenie udziału funduszy emerytalnych OFE',
    politiciansDetails: 'Zarząd: zgłoszenie MAR art. 19 (akumulacja)',
    shortDetails: 'KNF: szort Marshall Wace zredukowany z 0.69% do 0.64%',
    tradingviewUrl: 'https://stooq.pl/q/?s=dnp',
  },
  {
    ticker: 'ALE',
    name: 'Allegro.eu S.A.',
    market: 'GPW',
    score: 2,
    fundsDetails: 'Qube Research redukuje pozycję krótką o -0,07 p.p. do 3,28%',
    politiciansDetails: 'Insiderzy: zakupy menedżerskie',
    shortDetails: 'KNF: zamykanie szortów (potencjał short-squeeze)',
    tradingviewUrl: 'https://stooq.pl/q/?s=ale',
  },
];

const ConvergenceCard: FC<{ item: ConvergenceItem }> = ({ item }) => (
  <div className="p-5 rounded-3xl bg-surface border border-border-custom shadow-xs space-y-4 hover:border-primary/40 transition-colors">
    <div className="flex items-center justify-between pb-3 border-b border-border-custom/40">
      <div className="flex items-center gap-2.5">
        <span className="px-2.5 py-1 rounded-xl bg-surface border border-border-custom font-mono font-black text-sm text-text-primary shadow-xs">
          ${item.ticker}
        </span>
        <div>
          <h4 className="font-bold text-sm text-text-primary">{item.name}</h4>
          <span className="text-3xs text-text-muted font-mono">{item.market}</span>
        </div>
      </div>

      <div className="text-right flex items-center gap-2">
        <span className="px-2.5 py-1 rounded-xl bg-success/15 border border-success/30 text-success font-mono font-black text-sm tabular-nums">
          +{item.score} Zbieżność
        </span>
      </div>
    </div>

    <div className="space-y-2 text-xs">
      <div className="p-3 rounded-2xl bg-surface border border-border-custom/50">
        <strong className="text-text-primary block text-2xs font-semibold uppercase text-primary mb-0.5">
          👔 Fundusze 13F:
        </strong>
        <p className="text-text-secondary">{item.fundsDetails}</p>
      </div>

      <div className="p-3 rounded-2xl bg-surface border border-border-custom/50">
        <strong className="text-text-primary block text-2xs font-semibold uppercase text-info mb-0.5">
          🏛 Politycy & Insiderzy:
        </strong>
        <p className="text-text-secondary">{item.politiciansDetails}</p>
      </div>

      {item.shortDetails && (
        <div className="p-3 rounded-2xl bg-danger/10 border border-danger/20">
          <strong className="text-danger block text-2xs font-semibold uppercase flex items-center gap-1 mb-0.5">
            <ShieldAlert size={12} /> Sygnał Short-Squeeze GPW:
          </strong>
          <p className="text-text-secondary">{item.shortDetails}</p>
        </div>
      )}
    </div>

    <div className="pt-2 flex items-center justify-end border-t border-border-custom/30">
      <a
        href={item.tradingviewUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
      >
        Wykres notowań ↗
      </a>
    </div>
  </div>
);

export const ConvergenceView: FC = () => {
  const [filterMarket, setFilterMarket] = useState<'all' | 'USA' | 'GPW'>('all');

  const filtered = CONVERGENCE_DATA.filter((item) =>
    filterMarket === 'all' ? true : item.market === filterMarket
  );

  const handleExportCsv = () => {
    const headers = 'Ticker,Spolka,Rynek,Wynik_Zbieznosci,Fundusze_13F,Politycy_Insiderzy,Szorty_KNF\n';
    const rows = filtered
      .map(
        (c) =>
          `"${c.ticker}","${c.name}","${c.market}","+${c.score}","${c.fundsDetails}","${c.politiciansDetails}","${c.shortDetails || ''}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zbieznosc_inwestycji_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notify('Wyeksportowano zbieżność do pliku CSV!', 'success');
  };

  const handleCopyClipboard = () => {
    const text = filtered
      .map((c) => `+${c.score} ${c.ticker} (${c.name}): ${c.fundsDetails} | ${c.politiciansDetails}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    notify('Skopiowano ranking zbieżności do schowka!', 'success');
  };

  return (
    <div className="space-y-6 animate-fade-in text-text-primary">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-surface border border-border-custom shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border-custom/50">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                <TrendingUp size={12} /> Silnik Zbieżności (Convergence Engine)
              </span>
              <span className="text-2xs font-mono text-text-secondary">
                13F + STOCK Act + KNF MAR
              </span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">
              Gdzie spotykają się miliarderzy i politycy?
            </h2>
            <p className="text-xs text-text-secondary mt-1.5 max-w-2xl leading-relaxed">
              Najsilniejszy sygnał na rynku: spółki, które w tym samym czasie kupują legendarni zarządzający funduszy 13F (Buffett, Burry, Ackman) oraz kongresmeni USA lub członkowie zarządów na GPW.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="secondary"
              icon={<Copy size={13} />}
              onClick={handleCopyClipboard}
              className="rounded-xl text-xs font-semibold"
            >
              Kopiuj
            </Button>
            <Button
              size="sm"
              variant="primary"
              icon={<Download size={13} />}
              onClick={handleExportCsv}
              className="rounded-xl text-xs font-bold"
            >
              Eksportuj CSV
            </Button>
          </div>
        </div>

        {/* Market Filter Switcher */}
        <div className="flex items-center gap-2 mt-4 pt-1">
          <Button
            size="sm"
            variant={filterMarket === 'all' ? 'primary' : 'secondary'}
            onClick={() => setFilterMarket('all')}
            className="rounded-xl text-xs"
          >
            Wszystkie rynki ({CONVERGENCE_DATA.length})
          </Button>
          <Button
            size="sm"
            variant={filterMarket === 'USA' ? 'primary' : 'secondary'}
            onClick={() => setFilterMarket('USA')}
            className="rounded-xl text-xs"
          >
            🇺🇸 Wall Street (USA)
          </Button>
          <Button
            size="sm"
            variant={filterMarket === 'GPW' ? 'primary' : 'secondary'}
            onClick={() => setFilterMarket('GPW')}
            className="rounded-xl text-xs"
          >
            🇵🇱 Warszawa (GPW KNF)
          </Button>
        </div>
      </div>

      {/* Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((item) => (
          <ConvergenceCard key={item.ticker} item={item} />
        ))}
      </div>
    </div>
  );
};
