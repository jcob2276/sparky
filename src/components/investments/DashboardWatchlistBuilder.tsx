import { FC } from 'react';
import Button from '../ui/Button';
import { CompanyLogo } from './CompanyLogo';
import { useWatchlistSuggestions } from '../../lib/investments/useWatchlistDetails';
import { watchlistTickersForMarket } from '../../lib/investments/marketSymbol';

interface Props {
  watchlist: string[];
  onToggle: (ticker: string) => void;
  onDismiss: () => void;
}

export const DashboardWatchlistBuilder: FC<Props> = ({
  watchlist,
  onToggle,
  onDismiss,
}) => {
  const { data: suggestions = [], isPending, error } = useWatchlistSuggestions();
  const watched = watchlistTickersForMarket(watchlist, 'USA');

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
            Dodaj obserwowane spółki, aby porównywać ich ujawnienia na pulpicie. Poniżej spółki z dodatnim bilansem zmian w porównanych raportach 13F; to nie rekomendacje zakupu.
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
        {isPending && <p role="status" className="text-xs text-text-secondary">Pobieranie raportów SEC…</p>}
        {error && <p role="alert" className="text-xs text-danger">Nie udało się odczytać propozycji: {error.message}</p>}
        {!isPending && !error && suggestions.length === 0 && <p className="text-xs text-text-secondary">Brak spółek z porównaniem raportów. Spółkę możesz wyszukać w watchliście.</p>}
        {suggestions.map(({ ticker }) => {
          const isAdded = watched.has(ticker);
          return (
            <Button
              key={ticker}
              size="sm"
              variant={isAdded ? 'primary' : 'secondary'}
              onClick={() => onToggle(watchlist.includes(`${ticker}.US`) ? `${ticker}.US` : ticker)}
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
