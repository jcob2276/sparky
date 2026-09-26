import { FC, useState, useEffect, useRef } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Search, Plus, Loader2 } from 'lucide-react';
import {
  searchWatchlistCompanies,
  resolveWatchlistTicker,
  type SearchCompanyResult,
} from '../../lib/investments/watchlistService';
import { WatchlistSuggestionsDropdown } from './WatchlistSuggestionsDropdown';
import { notify } from '../../lib/notify';

interface Props {
  watchlist: string[];
  onAdd: (ticker: string) => void;
}

export const WatchlistAddForm: FC<Props> = ({ watchlist, onAdd }) => {
  const [draft, setDraft] = useState('');
  const [suggestions, setSuggestions] = useState<SearchCompanyResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [validating, setValidating] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Autocomplete debounced search (asynchronous to avoid cascading render)
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      const trimmed = draft.trim();
      if (trimmed.length < 1) {
        if (active) {
          setSuggestions([]);
          setShowDropdown(false);
        }
        return;
      }

      setSearching(true);
      const results = await searchWatchlistCompanies(trimmed);
      if (active) {
        setSuggestions(results);
        setShowDropdown(results.length > 0);
        setSearching(false);
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [draft]);

  // Zamknij dropdown przy kliknięciu poza komponent
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSelect = (item: SearchCompanyResult) => {
    const ticker = item.ticker.toUpperCase();
    if (watchlist.includes(ticker)) {
      notify(`Spółka ${ticker} jest już na Twojej watchliście.`, 'info');
    } else {
      onAdd(ticker);
      notify(`Dodano ${ticker} (${item.name}) do watchlisty.`, 'success');
    }
    setDraft('');
    setShowDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = draft.trim();
    if (!query || validating) return;

    setValidating(true);
    try {
      const match = await resolveWatchlistTicker(query);
      if (!match) {
        notify(`Nie znaleziono spółki "${query}" w bazie danych notowań (ani na GPW, ani w USA).`, 'error');
        return;
      }

      const ticker = match.ticker.toUpperCase();
      if (watchlist.includes(ticker)) {
        notify(`Spółka ${ticker} (${match.name}) jest już na liście.`, 'info');
      } else {
        onAdd(ticker);
        notify(`Potwierdzono ticker: dodano ${ticker} (${match.name}).`, 'success');
      }
      setDraft('');
      setShowDropdown(false);
    } catch {
      notify('Błąd weryfikacji tickera w bazie.', 'error');
    } finally {
      setValidating(false);
    }
  };

  return (
    <div ref={containerRef} className="relative mt-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setShowDropdown(true);
            }}
            placeholder="Wpisz ticker lub nazwę spółki: np. TSM, NVDA, Dino, Zabka, Nebius…"
            icon={searching ? <Loader2 size={15} className="animate-spin text-text-muted" /> : <Search size={15} />}
          />
        </div>
        <Button
          type="submit"
          size="sm"
          variant="primary"
          icon={validating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          disabled={validating || !draft.trim()}
          className="rounded-xl font-bold shrink-0"
        >
          {validating ? 'Weryfikacja…' : 'Dodaj'}
        </Button>
      </form>

      {/* Autocomplete Suggestions Dropdown */}
      {showDropdown && (
        <WatchlistSuggestionsDropdown
          suggestions={suggestions}
          watchlist={watchlist}
          onSelect={handleSelect}
        />
      )}
    </div>
  );
};
