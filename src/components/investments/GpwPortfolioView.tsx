import { FC, useEffect, useState } from 'react';
import { InsiderTradeItem } from '../../lib/investments/investmentsApi';
import { fetchGpwInsiderTrades } from '../../lib/investments/publicDisclosures';
import { InvestmentsCard } from './InvestmentsCard';

export const GpwPortfolioView: FC = () => {
  const [trades, setTrades] = useState<InsiderTradeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const rows = await fetchGpwInsiderTrades();
        if (active) setTrades(rows);
      } catch (err) {
        console.warn('[GpwPortfolioView]', err);
        if (active) setTrades([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const buys = trades.filter((trade) => (trade.transaction_type || '').toLowerCase().includes('buy')).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="p-6 rounded-3xl bg-surface border border-border-custom shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded-md text-2xs font-bold bg-danger/15 text-danger border border-danger/30">
            GPW · MAR art. 19
          </span>
        </div>
        <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">
          Transakcje osób pełniących obowiązki zarządcze
        </h2>
        <p className="text-xs text-text-secondary mt-1.5 max-w-3xl">
          Publiczny rejestr zawiadomień. Widok nie zawiera imion ani kwot, jeśli źródło ich nie publikuje.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
          <div className="p-3.5 rounded-2xl bg-surface border border-border-custom/60">
            <div className="text-xs text-text-secondary">Zgłoszenia</div>
            <div className="text-xl font-black font-mono mt-1">{loading ? '…' : trades.length}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-surface border border-border-custom/60">
            <div className="text-xs text-success">Kupno</div>
            <div className="text-xl font-black text-success font-mono mt-1">{loading ? '…' : buys}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-surface border border-border-custom/60">
            <div className="text-xs text-text-secondary">Ostatnia data</div>
            <div className="text-xl font-black font-mono mt-1">{trades[0]?.transaction_date ?? '—'}</div>
          </div>
        </div>
      </div>
      {loading ? (
        <p className="text-xs text-text-secondary">Pobieram zawiadomienia GPW…</p>
      ) : trades.length === 0 ? (
        <p className="p-8 text-center text-xs text-text-secondary rounded-3xl border border-border-custom bg-surface">
          Publiczny widok insiderów GPW jest pusty.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trades.map((trade) => (
            <InvestmentsCard key={trade.id} trade={trade} />
          ))}
        </div>
      )}
    </div>
  );
};
