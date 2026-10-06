import { FC, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { HoldingChangeItem } from '../../lib/investments/superinvestorDetailService';
import { SuperinvestorHoldingRow } from './SuperinvestorHoldingRow';
import Button from '../ui/Button';

interface Props {
  holdings: HoldingChangeItem[];
  newCount: number | null;
  decreasedCount: number | null;
  increasedCount: number | null;
  soldCount: number | null;
  filingUrl: string | null;
  previousFilingUrl: string | null;
  onSelectTicker?: (ticker: string) => void;
}

type TabKey = 'top' | 'new' | 'increased' | 'decreased' | 'sold';

export const SuperinvestorHoldingsTable: FC<Props> = ({
  holdings,
  newCount,
  decreasedCount,
  increasedCount,
  soldCount,
  filingUrl,
  previousFilingUrl,
  onSelectTicker,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('top');
  const [visibleCount, setVisibleCount] = useState(50);
  const selectTab = (tab: TabKey) => { setActiveTab(tab); setVisibleCount(50); };

  const filteredHoldings = holdings.filter((h) => {
    if (activeTab === 'new') return h.changeType === 'new';
    if (activeTab === 'increased') return h.changeType === 'increased';
    if (activeTab === 'decreased') return h.changeType === 'decreased';
    if (activeTab === 'sold') return h.changeType === 'sold';
    return (h.sharesNow ?? 0) > 0;
  });

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-border-custom shadow-2xs space-y-4">
      {/* Title & Tabs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-custom/50 pb-3">
        <h3 className="text-xs sm:text-sm font-black text-text-primary tracking-wider uppercase font-mono">
          Ujawnione pozycje SH
        </h3>

        {filingUrl && (
          <a
            href={filingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-2xs font-mono font-bold text-primary hover:underline"
          >
            SEC EDGAR
            <ExternalLink size={12} />
          </a>
        )}
      </div>
      {previousFilingUrl && <a href={previousFilingUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-xs">
        SEC EDGAR — poprzedni kwartał
      </a>}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <Button
          size="sm"
          variant={activeTab === 'top' ? 'primary' : 'ghost'}
          onClick={() => selectTab('top')}
          className="text-2xs font-bold rounded-xl"
        >
          Aktualne {holdings.filter(h => (h.sharesNow ?? 0) > 0).length}
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'new' ? 'primary' : 'ghost'}
          onClick={() => selectTab('new')}
          className="text-2xs font-bold rounded-xl"
        >
          Nowe {newCount ?? '—'}
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'increased' ? 'primary' : 'ghost'}
          onClick={() => selectTab('increased')}
          className="text-2xs font-bold rounded-xl"
        >
          Więcej akcji {increasedCount ?? '—'}
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'decreased' ? 'primary' : 'ghost'}
          onClick={() => selectTab('decreased')}
          className="text-2xs font-bold rounded-xl"
        >
          Mniej akcji {decreasedCount ?? '—'}
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'sold' ? 'primary' : 'ghost'}
          onClick={() => selectTab('sold')}
          className="text-2xs font-bold rounded-xl"
        >
          Nieobecne {soldCount ?? '—'}
        </Button>
      </div>
      {filteredHoldings.length === 0 && <p className="text-xs text-text-muted">
        {newCount === null ? 'Brak zweryfikowanego porównania kwartałów.' : 'Brak pozycji w tej kategorii.'}
      </p>}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border-custom/40 text-3xs font-mono uppercase tracking-wider text-text-muted">
              <th className="py-2.5 px-3 font-semibold">Pozycja</th>
              <th className="py-2.5 px-3 font-semibold text-right">Waga</th>
              <th className="py-2.5 px-3 font-semibold text-right">Akcje</th>
              <th className="py-2.5 px-3 font-semibold text-right">Δ Akcji</th>
              <th className="py-2.5 px-3 font-semibold text-right">Wartość</th>
              <th className="py-2.5 px-3 font-semibold text-right">Zmiana</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-custom/30 text-xs font-mono">
            {filteredHoldings.slice(0, visibleCount).map((h) => (
              <SuperinvestorHoldingRow
                key={h.cusip}
                holding={h}
                onSelectTicker={onSelectTicker}
              />
            ))}
          </tbody>
        </table>
      </div>
      {filteredHoldings.length > visibleCount && <Button variant="secondary" onClick={() => setVisibleCount(count => count + 50)}>
        Pokaż kolejne — {visibleCount} z {filteredHoldings.length}
      </Button>}
    </div>
  );
};
