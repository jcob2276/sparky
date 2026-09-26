import { FC, useEffect, useState } from 'react';
import Button from '../ui/Button';
import { InsiderTradeItem } from '../../lib/investments/investmentsApi';
import { alphaForTrades, AlphaPrint } from '../../lib/investments/publicMarket';
import { QuoteChart } from './QuoteChart';

function pct(value: number | null): string {
  if (value == null) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1).replace('.', ',')}%`;
}

interface Props {
  name: string;
  trades: InsiderTradeItem[];
  onClose: () => void;
}

export const PoliticianAlpha: FC<Props> = ({ name, trades, onClose }) => {
  const [rows, setRows] = useState<AlphaPrint[] | null>(null);
  const [loadedName, setLoadedName] = useState<string | null>(null);
  const [ticker, setTicker] = useState(trades.find((trade) => trade.ticker)?.ticker ?? '');

  useEffect(() => {
    let active = true;
    alphaForTrades(trades)
      .then((next) => {
        if (!active) return;
        setRows(next);
        setLoadedName(name);
        const first = next[0]?.ticker;
        if (first) setTicker(first);
      })
      .catch(() => {
        if (active) setRows([]);
      });
    return () => {
      active = false;
    };
  }, [name, trades]);

  const marks = trades
    .filter((trade) => trade.ticker === ticker && trade.transaction_date)
    .map((trade) => ({
      date: trade.transaction_date ?? '',
      up: (trade.transaction_type || '').toLowerCase().includes('buy'),
    }));

  return (
    <div className="border border-border-custom bg-surface p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-3xs font-mono uppercase tracking-wider text-text-muted">Profil wobec SPY</div>
          <h3 className="text-base font-bold">{name}</h3>
          <p className="text-xs text-text-secondary">
            Zmiana close_adj od daty zgłoszonej transakcji do ostatniej sesji w serii, obok SPY z tego samego dnia.
            Ostatnie {Math.min(trades.length, 8)} transakcji z tickerem.
          </p>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={onClose} className="text-xs font-mono text-text-muted">
          zamknij
        </Button>
      </div>
      {loadedName !== name || !rows ? (
        <p className="text-xs font-mono text-text-muted">Liczę zmianę wobec SPY…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-text-secondary">Brak notowań, z których da się policzyć zmianę.</p>
      ) : (
        <table className="w-full text-xs font-mono">
          <thead className="text-3xs uppercase text-text-muted">
            <tr>
              <th className="text-left py-1">Ticker</th>
              <th className="text-left">Data</th>
              <th className="text-right">Spółka</th>
              <th className="text-right">SPY</th>
              <th className="text-right">Różnica</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const gap = row.stockPct != null && row.spyPct != null ? row.stockPct - row.spyPct : null;
              return (
                <tr
                  key={`${row.ticker}-${row.tradeDate}-${row.side}`}
                  className="border-t border-border-custom/50 cursor-pointer"
                  onClick={() => setTicker(row.ticker)}
                >
                  <td className="py-1 font-bold">{row.ticker}</td>
                  <td>{row.tradeDate}</td>
                  <td className="text-right tabular-nums">{pct(row.stockPct)}</td>
                  <td className="text-right tabular-nums">{pct(row.spyPct)}</td>
                  <td className="text-right tabular-nums">{pct(gap)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {ticker && <QuoteChart ticker={ticker} marks={marks} />}
    </div>
  );
};
