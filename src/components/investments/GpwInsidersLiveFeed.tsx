import { FC, useState, useEffect } from 'react';
import {
  GpwInsiderLiveTrade,
  fetchGpwInsiderLiveFeed,
} from '../../lib/investments/gpwInsidersService';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { GpwInsiderFeedRow } from './GpwInsiderFeedRow';

interface Props {
  onSelectTicker?: (ticker: string) => void;
}

export const GpwInsidersLiveFeed: FC<Props> = ({ onSelectTicker }) => {
  const [sideFilter, setSideFilter] = useState<'all' | 'buy' | 'sell' | 'other'>('all');
  const [query, setQuery] = useState('');
  const [searchNeedle, setSearchNeedle] = useState('');
  const [trades, setTrades] = useState<GpwInsiderLiveTrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchNeedle(query), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let active = true;
    fetchGpwInsiderLiveFeed({ query: searchNeedle, side: sideFilter })
      .then((data) => {
        if (!active) return;
        setTrades(data);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setTrades([]);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [searchNeedle, sideFilter]);

  return (
    <div className="bg-surface border border-border-custom/70 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
      {/* Title & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-text-primary tracking-tight">
              Dane na żywo: zawiadomienia MAR art. 19
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-4xs font-mono uppercase bg-success/15 text-success border border-success/30 font-bold">
              ● Na żywo (Pro odblokowane)
            </span>
          </div>
          <p className="text-3xs text-text-muted mt-0.5">
            Bieżący strumień zawiadomień transakcji menedżerskich bezpośrednio z systemu ESPI GPW
          </p>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            variant={sideFilter === 'all' ? 'primary' : 'ghost'}
            onClick={() => {
              setLoading(true);
              setSideFilter('all');
            }}
            className="text-3xs font-mono"
          >
            Wszystkie
          </Button>
          <Button
            size="sm"
            variant={sideFilter === 'buy' ? 'primary' : 'ghost'}
            onClick={() => {
              setLoading(true);
              setSideFilter('buy');
            }}
            className="text-3xs font-mono text-success"
          >
            Nabycia (Kupno)
          </Button>
          <Button
            size="sm"
            variant={sideFilter === 'sell' ? 'primary' : 'ghost'}
            onClick={() => {
              setLoading(true);
              setSideFilter('sell');
            }}
            className="text-3xs font-mono text-danger"
          >
            Zbycia (Sprzedaż)
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-md">
        <Input
          type="text"
          size="sm"
          value={query}
          onChange={(e) => {
            setLoading(true);
            setQuery(e.target.value);
          }}
          placeholder="Filtruj po spółce, tickerze lub tytule zawiadomienia..."
        />
      </div>

      {/* Trades Table */}
      {loading ? (
        <div className="py-8 text-center text-xs font-mono text-text-muted">
          Pobieram zawiadomienia MAR art. 19…
        </div>
      ) : trades.length === 0 ? (
        <div className="py-8 text-center text-xs text-text-secondary font-mono">
          Brak zawiadomień spełniających kryteria.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border-custom/50 text-3xs uppercase font-mono tracking-wider text-text-muted">
                <th className="pb-2.5 font-semibold">Data</th>
                <th className="pb-2.5 font-semibold">Spółka</th>
                <th className="pb-2.5 font-semibold text-center">Rodzaj</th>
                <th className="pb-2.5 font-semibold">Tytuł zawiadomienia</th>
                <th className="pb-2.5 font-semibold text-right">Źródło</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-custom/40">
              {trades.map((t) => (
                <GpwInsiderFeedRow
                  key={t.id}
                  trade={t}
                  onSelectTicker={onSelectTicker}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
