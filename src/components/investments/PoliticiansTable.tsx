/**
 * PoliticiansTable.tsx — Table subcomponent for PoliticiansView.
 * Displays chronological STOCK Act transactions per selected politician.
 */
import { FC } from 'react';
import Button from '../ui/Button';
import { InsiderTradeItem } from '../../lib/investments/investmentsApi';

interface TradeRowProps {
  trade: InsiderTradeItem;
}

const TradeRow: FC<TradeRowProps & { onSelect: (name: string) => void }> = ({ trade: t, onSelect }) => {
  const isBuy =
    (t.transaction_type ?? '').toLowerCase().includes('buy') ||
    (t.transaction_type ?? '').toLowerCase().includes('purchase');

  const delay = t.days_to_file;
  const delayColor =
    delay != null && delay > 30 ? 'text-danger' : delay != null && delay > 10 ? 'text-warning' : 'text-success';

  return (
    <tr className="hover:bg-primary/5 transition-colors">
      <td className="py-3.5 px-4 whitespace-nowrap">
        <Button type="button" size="sm" variant="ghost" className="text-xs font-semibold text-primary" onClick={() => onSelect(t.filer_name)}>
          {t.filer_name}
        </Button>
      </td>
      <td className="py-3.5 px-4 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-md bg-surface border border-border-custom text-text-primary font-mono font-black text-xs shadow-xs">
            ${t.ticker}
          </span>
          <span className="text-xs text-text-secondary truncate max-w-[180px]">{t.asset_name}</span>
        </div>
      </td>
      <td className="py-3.5 px-4 whitespace-nowrap">
        <span
          className={`px-2 py-0.5 rounded-md text-2xs font-bold border ${
            isBuy
              ? 'bg-success/15 text-success border-success/30'
              : 'bg-danger/15 text-danger border-danger/30'
          }`}
        >
          {isBuy ? '🟢 Kupno' : '🔴 Sprzedaż'}
        </span>
      </td>
      <td className="py-3.5 px-4 text-right font-mono text-xs font-semibold text-text-primary tabular-nums whitespace-nowrap">
        {t.amount_label}
      </td>
      <td className="py-3.5 px-4 text-right font-mono text-xs text-text-secondary whitespace-nowrap">
        {t.transaction_date}
      </td>
      <td className="py-3.5 px-4 text-right font-mono text-xs whitespace-nowrap">
        <span className={`font-semibold ${delayColor}`}>{delay != null ? `${delay}d` : '—'}</span>
        <div className="text-3xs text-text-muted">{t.filing_date}</div>
      </td>
      <td className="py-3.5 px-4 text-right whitespace-nowrap">
        {t.doc_url && (
          <a
            href={t.doc_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-primary hover:underline"
          >
            Dok. ↗
          </a>
        )}
      </td>
    </tr>
  );
};

interface PoliticiansTableProps {
  trades: InsiderTradeItem[];
  onSelect: (name: string) => void;
}

export const PoliticiansTable: FC<PoliticiansTableProps> = ({ trades, onSelect }) => {
  if (trades.length === 0) {
    return (
      <div className="p-10 text-center text-xs text-text-secondary">
        Brak transakcji spełniających kryteria filtru.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface border-b border-border-custom/50 text-2xs text-text-secondary uppercase font-semibold">
          <tr>
            <th className="py-3 px-4">Osoba</th>
            <th className="py-3 px-4">Ticker &amp; Instrument</th>
            <th className="py-3 px-4">Typ</th>
            <th className="py-3 px-4 text-right">Kwota</th>
            <th className="py-3 px-4 text-right">Data transakcji</th>
            <th className="py-3 px-4 text-right">Opóźnienie</th>
            <th className="py-3 px-4 text-right">Źródło</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-custom/40">
          {trades.map((t) => (
            <TradeRow key={t.id} trade={t} onSelect={onSelect} />
          ))}
        </tbody>
      </table>
    </div>
  );
};
