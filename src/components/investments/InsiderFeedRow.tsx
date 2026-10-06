import { FC } from 'react';
import { InsiderFeedItem } from '../../lib/investments/insidersService';
import { CompanyLogo } from './CompanyLogo';

interface Props {
  item: InsiderFeedItem;
  onSelectTicker?: (ticker: string) => void;
}

export const InsiderFeedRow: FC<Props> = ({ item, onSelectTicker }) => {
  return (
    <tr className="hover:bg-surface-elevated/40 transition-colors group">
      {/* Zgłoszenie */}
      <td className="py-3 px-3 text-success font-medium">
        {item.docUrl ? <a href={item.docUrl} target="_blank" rel="noreferrer" className="underline" title={item.accession || 'SEC Form 4'}>{item.filingDate}</a> : item.filingDate}
        <div className="text-3xs text-text-muted">Transakcja: {item.transactionDate || '—'}{item.formType === '4/A' ? ' · korekta 4/A' : ''}</div>
      </td>

      {/* Spółka */}
      <td className="py-3 px-3">
        <div
          onClick={() => onSelectTicker?.(item.ticker)}
          className={`flex items-center gap-2.5 ${onSelectTicker ? 'cursor-pointer' : ''}`}
        >
          <CompanyLogo ticker={item.ticker} name={item.companyName} size={28} />
          <div className="min-w-0">
            <div className="font-bold text-text-primary group-hover:text-primary transition-colors flex items-center gap-1.5">
              {item.ticker}
            </div>
            <div className="text-3xs text-text-muted truncate max-w-36 sm:max-w-44">
              {item.companyName}
            </div>
          </div>
        </div>
      </td>

      {/* Insider */}
      <td className="py-3 px-3 text-text-primary font-bold">
        {item.insiderName}
        {item.insiderTitle && (
          <div className="text-3xs text-text-muted font-normal">{item.insiderTitle}</div>
        )}
      </td>

      {/* Typ Badge */}
      <td className="py-3 px-3 text-center">
        <span className="px-2 py-0.5 rounded-md text-3xs border border-border-custom">{item.typeBadgeLabel}</span>
      </td>

      {/* Akcje */}
      <td className="py-3 px-3 text-right text-text-secondary">
        {item.sharesFormatted}
      </td>

      {/* Cena */}
      <td className="py-3 px-3 text-right font-medium text-text-secondary">
        {item.priceFormatted}
      </td>

      {/* Wartość */}
      <td className="py-3 px-3 text-right font-bold text-text-primary">
        {item.valueFormatted}
      </td>
    </tr>
  );
};
