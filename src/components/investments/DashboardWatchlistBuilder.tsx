import { FC, useEffect, useState } from 'react';
import Button from '../ui/Button';
import { CompanyLogo } from './CompanyLogo';
import { fetchLiveConsensus } from '../../lib/investments/superinvestorsApi';

interface Props {
  watchlist: string[];
  onToggle: (ticker: string) => void;
  onDismiss: () => void;
}

const DEFAULT_SUGGESTIONS = ['AMZN', 'AMAT', 'NBIS', 'NTRA', 'CRH', 'EA', 'MDLN', 'STX', 'CRWV', 'TMO'];

export const DashboardWatchlistBuilder: FC<Props> = ({
  watchlist,
  onToggle,
  onDismiss,
}) => {
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);

  useEffect(() => {
    let active = true;
    fetchLiveConsensus()
      .then((rows) => {
        if (!active) return;
        if (rows && rows.length >= 5) {
          const tickers = rows.slice(0, 10).map((r) => r.ticker);
          setSuggestions(tickers);
        }
      })
      .catch(() => {
        // Keep defaults on fallback
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-border-custom shadow-xs space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-border-custom/40">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-text-primary">
              Zbuduj pierwszą watchlistę ({watchlist.length}/3)
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Dodaj co najmniej 3 spółki: codzienny digest e-mail powiadomi Cię, gdy kupią je politycy, fundusze 13F albo insiderzy.
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDismiss}
          className="text-xs text-text-muted hover:text-text-primary"
        >
          Pomiń
        </Button>
      </div>

      {/* Suggested Ticker Pills with Logos */}
      <div className="flex flex-wrap gap-2 pt-1">
        {suggestions.map((ticker) => {
          const isAdded = watchlist.includes(ticker);
          return (
            <Button
              key={ticker}
              size="sm"
              variant={isAdded ? 'primary' : 'secondary'}
              onClick={() => onToggle(ticker)}
              className="rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold flex items-center gap-1.5"
            >
              <CompanyLogo ticker={ticker} size={16} className="rounded-md" />
              <span>{ticker}</span>
              <span className="text-2xs font-bold">{isAdded ? '✓' : '+'}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};
