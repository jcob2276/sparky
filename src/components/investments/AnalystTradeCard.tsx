import { FC } from 'react';
import { TrendingUp, TrendingDown, Calendar, ArrowUpRight, DollarSign } from 'lucide-react';

export interface TradeItemData {
  action: 'BUY' | 'SELL';
  ticker: string;
  desc: string;
  amount: string;
  txDate: string;
  filingDate: string;
}

export const AnalystTradeCard: FC<TradeItemData> = ({
  action,
  ticker,
  desc,
  amount,
  txDate,
  filingDate,
}) => {
  const isBuy = action === 'BUY';
  const cleanTicker = ticker.replace(/[^A-Za-z0-9.]/g, '').toUpperCase();
  const hasTicker = cleanTicker && cleanTicker !== '—';

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl border border-border-custom bg-surface hover:border-border-custom/80 shadow-xs transition-all my-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      {/* Left side: Action, Ticker, Company */}
      <div className="flex items-start gap-3 min-w-0">
        <div
          className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 shrink-0 ${
            isBuy
              ? 'bg-success/10 text-success border border-success/20'
              : 'bg-danger/10 text-danger border border-danger/20'
          }`}
        >
          {isBuy ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          <span>{action}</span>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {hasTicker ? (
              <span className="font-mono font-black text-sm px-2 py-0.5 rounded-lg bg-surface border border-border-custom text-text-primary shadow-xs">
                ${cleanTicker}
              </span>
            ) : (
              <span className="text-xs text-text-muted font-mono font-medium">Brak tickera</span>
            )}
            {hasTicker && (
              <a
                href={`https://www.tradingview.com/symbols/${cleanTicker}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-muted hover:text-primary transition-colors text-xs inline-flex items-center gap-0.5"
                title="Otwórz wykres"
              >
                <ArrowUpRight size={13} />
              </a>
            )}
          </div>
          {desc && (
            <p className="text-2xs text-text-secondary truncate max-w-sm sm:max-w-md mt-1" title={desc}>
              {desc}
            </p>
          )}
        </div>
      </div>

      {/* Right side: Amount and Dates */}
      <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-1.5 sm:gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border-custom/40">
        {amount && (
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-surface-2 border border-border-custom/70 text-xs font-mono font-bold text-text-primary">
            <DollarSign size={12} className="text-text-muted shrink-0" />
            <span>{amount}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-2xs text-text-muted font-mono">
          {txDate && (
            <span className="inline-flex items-center gap-1" title="Data zawarcia transakcji">
              <Calendar size={11} className="shrink-0" />
              <span>{txDate}</span>
            </span>
          )}
          {filingDate && (
            <span className="text-text-muted/70" title="Data publicznego ujawnienia">
              (Ujawniono: {filingDate})
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
