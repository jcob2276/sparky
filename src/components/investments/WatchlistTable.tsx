import { FC } from 'react';
import Button from '../ui/Button';
import { Star, TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react';

export interface WatchlistItem {
  ticker: string;
  name: string;
  market: 'USA' | 'GPW';
  price: string;
  changePercent: number;
  signalsCount: number;
  lastSignal: string;
}

interface Props {
  items: WatchlistItem[];
  watchlist: string[];
  onToggle: (ticker: string) => void;
}

export const WatchlistTable: FC<Props> = ({ items, watchlist, onToggle }) => {
  return (
    <div className="bg-surface border border-border-custom rounded-3xl overflow-hidden shadow-xs">
      <div className="p-4 sm:p-5 border-b border-border-custom/50 flex items-center justify-between">
        <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
          <span>📋</span> Spółki na Twoim radarze ({items.length})
        </h3>
        <span className="text-xs text-text-secondary font-mono">
          Kliknij gwiazdkę, aby włączyć lub wyłączyć alerty
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface border-b border-border-custom/50 text-2xs text-text-secondary uppercase font-semibold">
            <tr>
              <th className="py-3 px-4 w-12 text-center">Alert</th>
              <th className="py-3 px-4">Spółka & Ticker</th>
              <th className="py-3 px-4 text-center">Rynek</th>
              <th className="py-3 px-4 text-right">Kurs</th>
              <th className="py-3 px-4 text-right">Zmiana Dziś</th>
              <th className="py-3 px-4">Ostatnie zdarzenie</th>
              <th className="py-3 px-4 text-right">Wykres</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-custom/40">
            {items.map((item) => {
              const rawTicker = item.ticker.replace('.WA', '');
              const isAdded = watchlist.includes(rawTicker) || watchlist.includes(item.ticker);
              const isPositive = item.changePercent >= 0;

              return (
                <tr
                  key={item.ticker}
                  className={`hover:bg-primary/5 transition-colors ${
                    isAdded ? 'bg-primary/5' : ''
                  }`}
                >
                  <td className="py-3.5 px-4 text-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onToggle(rawTicker)}
                      className={`p-1 h-auto text-base hover:scale-125 ${
                        isAdded ? 'text-primary' : 'text-text-muted hover:text-text-primary'
                      }`}
                      title={isAdded ? 'Usuń z watchlisty' : 'Dodaj do watchlisty'}
                    >
                      <Star size={16} fill={isAdded ? 'currentColor' : 'none'} />
                    </Button>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-text-primary font-mono text-xs flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-surface border border-border-custom shadow-xs">
                        ${item.ticker}
                      </span>
                      <span className="font-sans font-semibold text-text-secondary truncate max-w-[180px]">
                        {item.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-md text-2xs font-bold border ${
                      item.market === 'GPW' ? 'bg-danger/10 text-danger border-danger/20' : 'bg-info/10 text-info border-info/20'
                    }`}>
                      {item.market}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-text-primary tabular-nums">
                    {item.price}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums">
                    <span className={`inline-flex items-center gap-0.5 font-bold ${
                      isPositive ? 'text-success' : 'text-danger'
                    }`}>
                      {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {isPositive ? `+${item.changePercent.toFixed(2)}%` : `${item.changePercent.toFixed(2)}%`}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-text-secondary">
                    <span className="px-2 py-0.5 rounded-md bg-surface border border-border-custom font-mono text-2xs">
                      {item.lastSignal}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <a
                      href={
                        item.market === 'GPW'
                          ? `https://stooq.pl/q/?s=${rawTicker.toLowerCase()}`
                          : `https://www.tradingview.com/symbols/${rawTicker}/`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-0.5"
                    >
                      <span>Otwórz</span>
                      <ArrowUpRight size={12} />
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
