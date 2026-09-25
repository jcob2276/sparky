import { FC } from 'react';
import { InsiderTradeItem } from '../../lib/investments/investmentsApi';

interface Props {
  trade: InsiderTradeItem;
}

export const InvestmentsCard: FC<Props> = ({ trade }) => {
  const isBuy = trade.transaction_type.toLowerCase().includes('purchase') || trade.transaction_type.toLowerCase().includes('buy');
  const partyColor =
    trade.party === 'D'
      ? 'bg-primary/10 text-primary border-primary/20'
      : trade.party === 'R'
      ? 'bg-danger/10 text-danger border-danger/20'
      : 'bg-surface text-text-secondary border-border-custom/40';

  const partyName = trade.party === 'D' ? 'Demokrata' : trade.party === 'R' ? 'Republikanin' : trade.party || 'Niezależny';
  const chamberLabel =
    trade.chamber === 'house'
      ? 'Izba Reprezentantów'
      : trade.chamber === 'senate'
      ? 'Senat USA'
      : trade.branch === 'executive'
      ? 'Biały Dom'
      : 'Kongres USA';

  return (
    <article className="p-4 rounded-xl bg-card hover:bg-surface border border-border-custom/50 hover:border-border-custom transition-all flex flex-col justify-between">
      <div>
        {/* Top meta row */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`px-2 py-0.5 rounded-md text-2xs font-medium border ${partyColor}`}>
              {partyName} {trade.state ? `(${trade.state})` : ''}
            </span>
            <span className="text-2xs text-text-secondary font-mono">
              {chamberLabel}
            </span>
          </div>

          <span
            className={`px-2 py-0.5 rounded-md text-2xs font-medium border ${
              isBuy
                ? 'bg-success/10 text-success border-success/25'
                : 'bg-danger/10 text-danger border-danger/25'
            }`}
          >
            {isBuy ? '🟢 Kupno' : '🔴 Sprzedaż'}
          </span>
        </div>

        {/* Filer Name */}
        <h3 className="text-base font-semibold text-text-primary tracking-tight mb-1">
          {trade.filer_name}
        </h3>

        {/* Asset info */}
        <div className="flex items-baseline gap-2 mb-2">
          {trade.ticker && (
            <span className="px-2 py-0.5 rounded bg-surface border border-border-custom/60 text-text-primary font-mono font-bold text-xs">
              ${trade.ticker}
            </span>
          )}
          <span className="text-xs text-text-secondary font-medium truncate max-w-[240px]">
            {trade.asset_name || 'Akcje spółki'}
          </span>
        </div>

        {/* Amount */}
        <div className="text-sm font-semibold text-text-primary font-mono mb-3">
          {trade.amount_label || (trade.amount_high ? `do $${trade.amount_high.toLocaleString()}` : 'Kwota nieujawniona')}
        </div>
      </div>

      {/* Footer dates & link */}
      <div className="pt-3 border-t border-border-custom/30 flex items-center justify-between text-xs text-text-secondary">
        <div className="flex items-center gap-2">
          <span>Zgłoszono: <strong className="text-text-primary font-mono">{trade.filing_date || 'N/A'}</strong></span>
          {typeof trade.days_to_file === 'number' && (
            <span
              className={`text-2xs px-1.5 py-0.5 rounded font-mono ${
                trade.days_to_file > 30 ? 'bg-warning/10 text-warning' : 'bg-surface text-text-secondary'
              }`}
            >
              +{trade.days_to_file}d
            </span>
          )}
        </div>

        {trade.doc_url && (
          <a
            href={trade.doc_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-text-secondary hover:text-text-primary underline underline-offset-2 transition-colors"
          >
            Raport PDF ↗
          </a>
        )}
      </div>
    </article>
  );
};
