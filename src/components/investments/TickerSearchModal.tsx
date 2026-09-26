/**
 * TickerSearchModal.tsx — Global cross-source ticker search for OrcaFolio.
 * Searches 13F holdings, politician STOCK Act trades, and KNF short positions simultaneously.
 * Renders as a floating modal overlay triggered from InvestmentsTopNav.
 */
import { FC, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { INVESTORS_13F_DATA } from '../../lib/investments/investors13FData';
import { PELOSI_TRADES_SEED } from '../../lib/investments/pelosiTradesSeed';
import { TRUMP_TRADES_SEED } from '../../lib/investments/trumpTradesSeed';
import { CONGRESS_SEED_EXTRA } from '../../lib/investments/congressSeedData';
import { getGroupedCompanyShorts } from '../../lib/investments/knfShortsData';
import { GPW_INSIDER_TRADES_SEED } from '../../lib/investments/gpwTradesSeed';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { X, Search } from 'lucide-react';

const ALL_POLITICIAN_TRADES = [...PELOSI_TRADES_SEED, ...TRUMP_TRADES_SEED, ...CONGRESS_SEED_EXTRA];
const ALL_KNF_GROUPED = getGroupedCompanyShorts();

interface SearchResult {
  source: '13F' | 'STOCK Act' | 'KNF Szort' | 'GPW MAR';
  ticker: string;
  title: string;
  detail: string;
  url?: string;
}

function runSearch(query: string): SearchResult[] {
  if (query.length < 2) return [];
  const q = query.toUpperCase().trim();
  const results: SearchResult[] = [];

  // 1. 13F institutional holdings
  for (const inv of INVESTORS_13F_DATA) {
    for (const h of inv.holdings) {
      if (h.ticker.toUpperCase().includes(q) || h.name.toUpperCase().includes(q)) {
        results.push({
          source: '13F',
          ticker: h.ticker,
          title: `${h.ticker} — ${h.name}`,
          detail: `${inv.name} · waga ${h.weightPercent.toFixed(1)}% · zmiana: ${h.changeType}`,
          url: `https://www.tradingview.com/symbols/${h.ticker}/`,
        });
        if (results.filter((r) => r.source === '13F').length >= 6) break;
      }
    }
  }

  // 2. STOCK Act politician trades
  for (const t of ALL_POLITICIAN_TRADES) {
    if (
      (t.ticker ?? '').toUpperCase().includes(q) ||
      (t.asset_name ?? '').toUpperCase().includes(q)
    ) {
      const isBuy =
        (t.transaction_type ?? '').toLowerCase().includes('buy') ||
        (t.transaction_type ?? '').toLowerCase().includes('purchase');
      results.push({
        source: 'STOCK Act',
        ticker: t.ticker ?? '—',
        title: `${t.ticker} — ${t.filer_name}`,
        detail: `${isBuy ? '🟢 Kupno' : '🔴 Sprzedaż'} · ${t.amount_label} · ${t.transaction_date}`,
        url: t.doc_url ?? undefined,
      });
    }
  }

  // 3. KNF short positions
  for (const g of ALL_KNF_GROUPED) {
    if (g.ticker.toUpperCase().includes(q) || g.companyName.toUpperCase().includes(q)) {
      results.push({
        source: 'KNF Szort',
        ticker: g.ticker,
        title: `${g.ticker} — ${g.companyName}`,
        detail: `Łączna pozycja krótka: ${g.totalShortPercent.toFixed(2)}% · ${g.fundsCount} funduszy`,
        url: `https://stooq.pl/q/?s=${g.ticker.toLowerCase()}`,
      });
    }
  }

  // 4. GPW MAR insider trades
  for (const t of GPW_INSIDER_TRADES_SEED) {
    if (
      (t.ticker ?? '').toUpperCase().includes(q) ||
      (t.asset_name ?? '').toUpperCase().includes(q) ||
      (t.filer_name ?? '').toUpperCase().includes(q)
    ) {
      const isBuy =
        (t.transaction_type ?? '').toLowerCase().includes('buy') ||
        (t.transaction_type ?? '').toLowerCase().includes('purchase') ||
        (t.transaction_type ?? '').toLowerCase().includes('nabycie');
      results.push({
        source: 'GPW MAR',
        ticker: t.ticker ?? '—',
        title: `${t.ticker} — ${t.filer_name}`,
        detail: `${isBuy ? '🟢 Kupno' : '🔴 Sprzedaż'} · ${t.amount_label} · MAR art. 19`,
        url: `https://stooq.pl/q/?s=${(t.ticker ?? '').toLowerCase()}`,
      });
    }
  }

  return results.slice(0, 20);
}

const SOURCE_STYLE: Record<string, string> = {
  '13F': 'bg-primary/10 text-primary border-primary/20',
  'STOCK Act': 'bg-info/10 text-info border-info/20',
  'KNF Szort': 'bg-danger/10 text-danger border-danger/20',
  'GPW MAR': 'bg-success/10 text-success border-success/20',
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const TickerSearchModal: FC<Props> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const results = useMemo(() => runSearch(query), [query]);

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

  const quickTickers = ['NVDA', 'AAPL', 'GOOGL', 'AMZN', 'AVGO', 'DNP', 'CDR', 'ALE'];

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
                    ${t}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {query.length >= 2 && (
            <div className="max-h-[60vh] overflow-y-auto">
              {results.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-secondary">
                  Brak wyników dla <strong className="text-text-primary">{query.toUpperCase()}</strong> we wszystkich źródłach.
                </div>
              ) : (
                <div className="divide-y divide-border-custom/40">
                  {results.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 p-3.5 hover:bg-primary/5 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`shrink-0 px-2 py-0.5 rounded-md text-2xs font-bold border ${SOURCE_STYLE[r.source]}`}
                        >
                          {r.source}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-text-primary truncate">{r.title}</div>
                          <div className="text-2xs text-text-secondary truncate mt-0.5">{r.detail}</div>
                        </div>
                      </div>
                      {r.url && (
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 text-xs font-semibold text-primary hover:underline"
                        >
                          ↗
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {results.length > 0 && (
                <div className="p-3 border-t border-border-custom/40 text-center text-2xs text-text-muted">
                  {results.length} wyników · 13F · STOCK Act · KNF · GPW MAR
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
