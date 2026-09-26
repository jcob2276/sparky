import { FC } from 'react';
import Button from '../ui/Button';
import { WatchlistTable, WatchlistItem } from './WatchlistTable';

const ALL_WATCHLIST_DATA: WatchlistItem[] = [
  { ticker: 'AAPL', name: 'Apple Inc.', market: 'USA', price: '$335.92', changePercent: -0.33, signalsCount: 3, lastSignal: 'Pete Sessions (sprzedaż)' },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', market: 'USA', price: '$249.38', changePercent: 0.04, signalsCount: 5, lastSignal: 'Konsensus +4 funduszy' },
  { ticker: 'NVDA', name: 'NVIDIA Corp.', market: 'USA', price: '$224.58', changePercent: -0.41, signalsCount: 6, lastSignal: 'Nancy Pelosi (Call LEAPS)' },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', market: 'USA', price: '$342.36', changePercent: 1.34, signalsCount: 4, lastSignal: 'Sheri Biggs (kupno)' },
  { ticker: 'MSFT', name: 'Microsoft Corp.', market: 'USA', price: '$497.93', changePercent: -0.53, signalsCount: 4, lastSignal: 'Nancy Pelosi (Call LEAPS)' },
  { ticker: 'AVGO', name: 'Broadcom Inc.', market: 'USA', price: '$350.36', changePercent: -1.30, signalsCount: 3, lastSignal: 'Richard W. Allen (kupno)' },
  { ticker: 'TSLA', name: 'Tesla Inc.', market: 'USA', price: '$377.94', changePercent: -0.57, signalsCount: 2, lastSignal: 'Realizacja zysków' },
  { ticker: 'META', name: 'Meta Platforms Inc.', market: 'USA', price: '$777.59', changePercent: 4.50, signalsCount: 2, lastSignal: 'Mark Kelly (kupno)' },
  { ticker: 'DNP.WA', name: 'Dino Polska S.A.', market: 'GPW', price: '34,44 zł', changePercent: -0.55, signalsCount: 3, lastSignal: 'KNF Short: AQR 0.82%' },
  { ticker: 'CDR.WA', name: 'CD Projekt S.A.', market: 'GPW', price: '244,60 zł', changePercent: -0.53, signalsCount: 3, lastSignal: 'KNF Short: Citadel 0.78%' },
  { ticker: 'ALE.WA', name: 'Allegro.eu S.A.', market: 'GPW', price: '49,56 zł', changePercent: 0.59, signalsCount: 2, lastSignal: 'KNF Short: Marshall Wace 0.91%' },
  { ticker: 'JSW.WA', name: 'Jastrzębska Spółka Węglowa', market: 'GPW', price: '30,90 zł', changePercent: -0.83, signalsCount: 2, lastSignal: 'KNF Short: Qube 0.73%' },
  { ticker: 'KRU.WA', name: 'Kruk S.A.', market: 'GPW', price: '382,00 zł', changePercent: -0.96, signalsCount: 1, lastSignal: 'Two Sigma +0.08 p.p.' },
  { ticker: 'XTB.WA', name: 'XTB S.A.', market: 'GPW', price: '151,50 zł', changePercent: -1.60, signalsCount: 2, lastSignal: 'GPW MAR Insider Kupno' },
];

interface Props {
  watchlist: string[];
  onToggle: (ticker: string) => void;
}

export const InvestmentsWatchlistView: FC<Props> = ({ watchlist, onToggle }) => {
  return (
    <div className="space-y-6 animate-fade-in text-text-primary">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-surface border border-border-custom shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border-custom/50">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-md text-2xs font-bold bg-primary/10 text-primary border border-primary/20">
                Moja Watchlista · Indeks Równych Wag
              </span>
              <span className="text-2xs font-mono text-text-secondary">
                Obserwowanych: {watchlist.length} spółek
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">
              Watchlista spółek USA & GPW
            </h2>
            <p className="text-xs text-text-secondary mt-1.5 max-w-3xl leading-relaxed">
              Ceny z ostatniej sesji, natychmiastowe alerty o ruchach superinwestorów 13F, polityków Kongresu (STOCK Act) oraz pozycjach krótkich KNF dla spółek, które obserwujesz.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 shrink-0">
            <div className="p-3.5 rounded-2xl bg-surface border border-border-custom/70 text-right shadow-xs">
              <div className="text-2xs text-text-secondary font-medium">Obserwowane</div>
              <div className="text-xl font-black text-primary font-mono mt-0.5">{watchlist.length}</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-surface border border-border-custom/70 text-right shadow-xs">
              <div className="text-2xs text-text-secondary font-medium">Alerty 14 dni</div>
              <div className="text-xl font-black text-success font-mono mt-0.5">18</div>
            </div>
          </div>
        </div>

        {/* Quick ticker toggles */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="text-2xs font-bold text-text-muted uppercase tracking-wider mr-1">
            Szybkie dodanie:
          </span>
          {ALL_WATCHLIST_DATA.map((item) => {
            const rawTicker = item.ticker.replace('.WA', '');
            const isAdded = watchlist.includes(rawTicker) || watchlist.includes(item.ticker);
            return (
              <Button
                key={item.ticker}
                size="sm"
                variant={isAdded ? 'primary' : 'secondary'}
                onClick={() => onToggle(rawTicker)}
                className="rounded-xl text-xs font-mono"
              >
                <span>{item.ticker}</span>
                <span className="ml-1 text-2xs">{isAdded ? '★' : '+'}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Main Table Subcomponent */}
      <WatchlistTable
        items={ALL_WATCHLIST_DATA}
        watchlist={watchlist}
        onToggle={onToggle}
      />
    </div>
  );
};
