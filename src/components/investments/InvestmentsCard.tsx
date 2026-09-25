import { FC } from 'react';
import { InsiderTradeItem } from '../../lib/investments/investmentsApi';

interface Props {
  trade: InsiderTradeItem;
  isCluster?: boolean;
}

export const InvestmentsCard: FC<Props> = ({ trade, isCluster }) => {
  const isBuy = trade.transaction_type.toLowerCase().includes('purchase') || trade.transaction_type.toLowerCase().includes('buy');
  const isPolish = trade.state === 'PL' || trade.branch === 'gpw_mar';
  const isWhale = (trade.amount_high || 0) >= 250000 || (isPolish && (trade.amount_high || 0) >= 1000000);

  const partyColor =
    isPolish
      ? 'bg-primary/10 text-primary border-primary/20'
      : trade.party === 'D'
      ? 'bg-info/10 text-info border-info/20'
      : trade.party === 'R'
      ? 'bg-danger/10 text-danger border-danger/20'
      : 'bg-surface text-text-secondary border-border-custom/50';

  const partyName = isPolish
    ? 'GPW Warszawa'
    : trade.party === 'D'
    ? 'Demokrata'
    : trade.party === 'R'
    ? 'Republikanin'
    : trade.party || 'Niezależny';

  const chamberLabel = isPolish
    ? (trade.chamber || 'GPW')
    : trade.chamber === 'house'
    ? 'Izba Reprezentantów'
    : trade.chamber === 'senate'
    ? 'Senat USA'
    : trade.branch === 'executive'
    ? 'Biały Dom'
    : 'Kongres USA';

  const chartUrl = trade.ticker
    ? isPolish
      ? `https://stooq.pl/q/?s=${trade.ticker.toLowerCase()}`
      : `https://www.tradingview.com/symbols/${trade.ticker}/`
    : null;

  const days = trade.days_to_file;
  const isFresh = typeof days === 'number' && days <= 14;
  const isActiveTrend = typeof days === 'number' && days > 14 && days <= 30;

  return (
    <article className="p-4 rounded-2xl bg-surface border border-border-custom/70 shadow-xs hover:shadow-md hover:border-primary/50 transition-shadow flex flex-col justify-between">
      <div>
        {/* Top Badges Row */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`px-2 py-0.5 rounded-md text-2xs font-semibold border ${partyColor}`}>
              {partyName} {trade.state && !isPolish ? `(${trade.state})` : ''}
            </span>
            <span className="text-2xs text-text-secondary font-mono">
              {chamberLabel}
            </span>
            {isCluster && (
              <span className="px-1.5 py-0.5 rounded-md text-2xs font-semibold bg-warning/15 text-warning border border-warning/30">
                🔥 Klaster
              </span>
            )}
            {isWhale && (
              <span className="px-1.5 py-0.5 rounded-md text-2xs font-semibold bg-primary/15 text-primary border border-primary/30">
                🐋 Wieloryb
              </span>
            )}
          </div>

          <span
            className={`px-2 py-0.5 rounded-md text-2xs font-semibold border ${
              isBuy
                ? 'bg-success/15 text-success border-success/30'
                : 'bg-danger/15 text-danger border-danger/30'
            }`}
          >
            {isBuy ? '🟢 Kupno' : '🔴 Sprzedaż'}
          </span>
        </div>

        {/* Filer Name */}
        <h3 className="text-base font-bold text-text-primary tracking-tight mb-1">
          {trade.filer_name}
        </h3>

        {/* Asset / Ticker Row */}
        <div className="flex items-baseline gap-2 mb-2 flex-wrap">
          {trade.ticker && (
            <span className="px-2 py-0.5 rounded-md bg-surface border border-border-custom text-text-primary font-mono font-bold text-xs shadow-xs">
              {isPolish ? `${trade.ticker}.WA` : `$${trade.ticker}`}
            </span>
          )}
          <span className="text-xs text-text-secondary font-medium truncate max-w-xs">
            {trade.asset_name || 'Akcje spółki'}
          </span>
        </div>

        {/* Amount */}
        <div className="text-sm font-bold text-text-primary font-mono tabular-nums mb-3">
          {trade.amount_label || (trade.amount_high ? `do $${trade.amount_high.toLocaleString()}` : 'Kwota nieujawniona')}
        </div>
      </div>

      {/* Footer Info & Actions */}
      <div className="pt-3 border-t border-border-custom/40 flex items-center justify-between text-xs text-text-secondary">
        <div className="flex items-center gap-2">
          <span>Zgłoszono: <strong className="text-text-primary font-mono tabular-nums">{trade.filing_date || 'N/A'}</strong></span>
          {typeof days === 'number' && (
            <span
              className={`text-2xs px-1.5 py-0.5 rounded-md font-mono font-medium ${
                isFresh
                  ? 'bg-success/15 text-success border border-success/25'
                  : isActiveTrend
                  ? 'bg-warning/15 text-warning border border-warning/25'
                  : 'bg-surface border border-border-custom/50 text-text-secondary'
              }`}
              title={isFresh ? 'Wysoka kopiowalność (<14d)' : 'Sprawdź wykres'}
            >
              {isFresh ? `⚡ +${days}d` : `+${days}d`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {chartUrl && (
            <a
              href={chartUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-primary hover:underline underline-offset-2 transition-colors flex items-center gap-0.5"
            >
              Wykres ↗
            </a>
          )}
          {trade.doc_url && (
            <a
              href={trade.doc_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-text-secondary hover:text-text-primary underline underline-offset-2 transition-colors"
            >
              Raport ↗
            </a>
          )}
        </div>
      </div>
    </article>
  );
};
