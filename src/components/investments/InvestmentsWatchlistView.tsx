import { FC, useEffect, useMemo, useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { orcaSelect } from '../../lib/investments/superinvestorsApi';
import { WatchlistTable, WatchlistItem } from './WatchlistTable';

interface ConsensusRow {
  ticker?: string;
  company_name?: string;
  net_buyers?: number;
  holders?: number;
}

interface Props {
  watchlist: string[];
  onToggle: (ticker: string) => void;
}

export const InvestmentsWatchlistView: FC<Props> = ({ watchlist, onToggle }) => {
  const [draft, setDraft] = useState('');
  const [rows, setRows] = useState<ConsensusRow[]>([]);

  useEffect(() => {
    if (watchlist.length === 0) return;
    let active = true;
    const list = watchlist.map((ticker) => ticker.replace(/[^A-Za-z0-9.]/g, '').toUpperCase()).filter(Boolean).join(',');
    (async () => {
      try {
        const data = await orcaSelect<ConsensusRow>(
          `vw_consensus?select=ticker,company_name,net_buyers,holders&ticker=in.(${list})&limit=80`,
        );
        if (active) setRows(data);
      } catch {
        if (active) setRows([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [watchlist]);

  const items = useMemo<WatchlistItem[]>(() => {
    const byTicker = new Map(rows.map((row) => [row.ticker ?? '', row]));
    return watchlist.map((ticker) => {
      const match = byTicker.get(ticker);
      const net = match?.net_buyers;
      return {
        ticker,
        name: match?.company_name || ticker,
        market: ticker.endsWith('.WA') ? 'GPW' : 'USA',
        price: '—',
        changePercent: null,
        signalsCount: typeof net === 'number' ? Math.abs(net) : 0,
        lastSignal: typeof net === 'number' ? `Konsensus 13F: netto ${net}` : 'Brak w konsensusie 13F',
      };
    });
  }, [rows, watchlist]);

  const withConsensus = items.filter((item) => item.lastSignal.startsWith('Konsensus')).length;

  const addDraft = () => {
    const ticker = draft.trim().toUpperCase().replace(/[^A-Z0-9.]/g, '');
    if (!ticker) return;
    if (!watchlist.includes(ticker)) onToggle(ticker);
    setDraft('');
  };

  return (
    <div className="space-y-6 animate-fade-in text-text-primary">
      <div className="p-6 rounded-3xl bg-surface border border-border-custom shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Watchlista</h2>
            <p className="text-xs text-text-secondary mt-1.5 max-w-3xl">
              Tylko spółki, które sam dodasz. Kursu nie pokazujemy, gdy publiczne źródło nie ma świeżej ceny.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 shrink-0">
            <div className="p-3.5 rounded-2xl border border-border-custom/70 text-right">
              <div className="text-2xs text-text-secondary">Obserwowane</div>
              <div className="text-xl font-black text-primary font-mono mt-0.5">{watchlist.length}</div>
            </div>
            <div className="p-3.5 rounded-2xl border border-border-custom/70 text-right">
              <div className="text-2xs text-text-secondary">W konsensusie 13F</div>
              <div className="text-xl font-black font-mono mt-0.5">{withConsensus}</div>
            </div>
          </div>
        </div>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            addDraft();
          }}
        >
          <Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Dodaj ticker, np. TSM" />
          <Button type="submit" size="sm" variant="primary">Dodaj</Button>
        </form>
      </div>
      {watchlist.length === 0 ? (
        <p className="p-8 text-center text-xs text-text-secondary rounded-3xl border border-border-custom bg-surface">
          Watchlista jest pusta. Dodaj ticker powyżej albo z wyszukiwarki.
        </p>
      ) : (
        <WatchlistTable items={items} watchlist={watchlist} onToggle={onToggle} />
      )}
    </div>
  );
};
