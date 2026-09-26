/**
 * TickerSearchModal.tsx — Global cross-source ticker search for OrcaFolio.
 * Searches 13F holdings, politician STOCK Act trades, and KNF short positions simultaneously.
 * Renders as a floating modal overlay triggered from InvestmentsTopNav.
 */
import { FC, useState, useEffect, useRef, useCallback } from 'react';
import { searchDisclosures, type DisclosureSearchHit, type SearchSource } from '../../lib/investments/disclosureSearch';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { X, Search } from 'lucide-react';

const SOURCE_STYLE: Record<SearchSource, string> = {
  '13F': 'bg-primary/10 text-primary border-primary/20',
  'STOCK Act': 'bg-info/10 text-info border-info/20',
  Polityk: 'bg-success/10 text-success border-success/20',
  Superinwestor: 'bg-primary/10 text-primary border-primary/20',
};

const SearchHits: FC<{ query: string; searching: boolean; results: DisclosureSearchHit[] }> = ({
  query,
  searching,
  results,
}) => (
  <div className="max-h-[60vh] overflow-y-auto">
    {searching ? (
      <div className="p-8 text-center text-xs text-text-secondary">Szukam w Kongresie, 13F i STOCK Act…</div>
    ) : results.length === 0 ? (
      <div className="p-8 text-center text-xs text-text-secondary">
        Brak wyników dla <strong className="text-text-primary">{query.toUpperCase()}</strong> w politykach, superinwestorach i ujawnieniach.
      </div>
    ) : (
      <div className="divide-y divide-border-custom/40">
        {results.map((hit, index) => (
          <div key={`${hit.source}-${hit.title}-${index}`} className="flex items-center justify-between gap-3 p-3.5 hover:bg-primary/5 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <span className={`shrink-0 px-2 py-0.5 rounded-md text-2xs font-bold border ${SOURCE_STYLE[hit.source]}`}>
                {hit.source}
              </span>
              <div className="min-w-0">
                <div className="text-xs font-bold text-text-primary truncate">{hit.title}</div>
                <div className="text-2xs text-text-secondary truncate mt-0.5">{hit.detail}</div>
              </div>
            </div>
            {hit.url && (
              <a href={hit.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs font-semibold text-primary hover:underline">
                ↗
              </a>
            )}
          </div>
        ))}
      </div>
    )}
    {results.length > 0 && !searching && (
      <div className="p-3 border-t border-border-custom/40 text-center text-2xs text-text-muted">
        {results.length} wyników · politycy · superinwestorzy · STOCK Act · 13F
      </div>
    )}
  </div>
);

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const TickerSearchModal: FC<Props> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DisclosureSearchHit[]>([]);
  const [settledQuery, setSettledQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.trim().length < 2) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      searchDisclosures(query)
        .then((hits) => {
          if (cancelled) return;
          setResults(hits);
          setSettledQuery(query);
        })
        .catch(() => {
          if (cancelled) return;
          setResults([]);
          setSettledQuery(query);
        });
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const searching = query.trim().length >= 2 && settledQuery !== query;
  const shown = query.trim().length < 2 ? [] : results;
  const quickTickers = ['Pelosi', 'Demokraci', 'Republikanie', 'Kongres', 'Superinwestorzy', 'NVDA', 'AAPL'];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed top-0 left-0 right-0 bottom-0 z-[var(--z-modal)] bg-black/50 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-[10vh] left-1/2 -translate-x-1/2 z-[var(--z-overlay)] w-full max-w-2xl px-4 animate-fade-in">
        <div className="bg-surface border border-border-custom rounded-3xl shadow-2xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 p-4 border-b border-border-custom/50">
            <div className="flex-1">
              <Input
                ref={inputRef}
                type="text"
                size="md"
                icon={<Search size={16} />}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Szukaj tickera lub spółki: NVDA, GOOGL, Pelosi, DNP…"
              />
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="p-1.5 rounded-xl text-text-muted hover:text-text-primary shrink-0"
            >
              <X size={16} />
            </Button>
          </div>

          {/* Quick pills when empty */}
          {query.length < 2 && (
            <div className="p-4 space-y-3">
              <p className="text-2xs font-semibold text-text-muted uppercase tracking-wider">
                Szybkie skróty
              </p>
              <div className="flex flex-wrap gap-2">
                {quickTickers.map((t) => (
                  <Button
                    key={t}
                    size="sm"
                    variant="secondary"
                    onClick={() => setQuery(t)}
                    className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold"
                  >
                    {t.length <= 5 && t === t.toUpperCase() ? `$${t}` : t}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {query.length >= 2 && (
            <SearchHits query={query} searching={searching} results={shown} />
          )}
        </div>
      </div>
    </>
  );
};
