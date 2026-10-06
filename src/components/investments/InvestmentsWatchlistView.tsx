import { FC } from 'react';
import { WatchlistTable } from './WatchlistTable';
import { WatchlistAddForm } from './WatchlistAddForm';
import { useWatchlistDetails } from '../../lib/investments/useWatchlistDetails';
import { Loader2 } from 'lucide-react';

interface Props {
  watchlist: string[];
  onToggle: (ticker: string) => void;
}

export const InvestmentsWatchlistView: FC<Props> = ({ watchlist, onToggle }) => {
  const { data: items = [], isPending: loading } = useWatchlistDetails(watchlist);
  const withConsensus = items.filter(
    (item) => item.lastSignal.startsWith('13F: bilans') || item.lastSignal.startsWith('Szort')
  ).length;

  return (
    <div className="space-y-6 animate-fade-in text-text-primary">
      <div className="p-6 rounded-3xl bg-surface border border-border-custom shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Watchlista</h2>
            <p className="text-xs text-text-secondary mt-1.5 max-w-3xl">
              Obserwuj spółki GPW i USA dostępne w bazie. Notowania mają datę i źródło; zmiany 13F porównują raportowane pozycje, a KNF pokazuje publicznie ujawnione szorty.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 shrink-0">
            <div className="p-3.5 rounded-2xl border border-border-custom/70 text-right">
              <div className="text-2xs text-text-secondary">Obserwowane</div>
              <div className="text-xl font-black text-primary font-mono mt-0.5">{watchlist.length}</div>
            </div>
            <div className="p-3.5 rounded-2xl border border-border-custom/70 text-right">
              <div className="text-2xs text-text-secondary">Z danymi 13F / KNF</div>
              <div className="text-xl font-black font-mono mt-0.5">{withConsensus}</div>
            </div>
          </div>
        </div>

        {/* Search input with live DB autocomplete & confirmation */}
        <WatchlistAddForm watchlist={watchlist} onAdd={onToggle} />
      </div>

      {loading && items.length === 0 ? (
        <div className="p-12 text-center text-xs text-text-secondary rounded-3xl border border-border-custom bg-surface flex flex-col items-center justify-center gap-2">
          <Loader2 size={24} className="animate-spin text-primary" />
          <span>Weryfikacja danych i pobieranie notowań z rejestrów…</span>
        </div>
      ) : watchlist.length === 0 ? (
        <p className="p-8 text-center text-xs text-text-secondary rounded-3xl border border-border-custom bg-surface">
          Watchlista jest pusta. Wpisz ticker lub nazwę spółki powyżej, aby dodać ją do radaru.
        </p>
      ) : (
        <WatchlistTable items={items} watchlist={watchlist} onToggle={onToggle} />
      )}
    </div>
  );
};
