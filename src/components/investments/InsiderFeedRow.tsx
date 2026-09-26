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
        {item.filingDate}
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
        {item.transactionType === 'purchase' && (
          <span className="px-2 py-0.5 rounded-md text-3xs font-bold bg-success/10 text-success border border-success/20">
            Kupno
          </span>
        )}
        {item.transactionType === 'sale' && (
          <span className="px-2 py-0.5 rounded-md text-3xs font-bold bg-danger/10 text-danger border border-danger/20">
            Sprzedaż
          </span>
        )}
        {item.transactionType === 'option' && (
          <span className="px-2 py-0.5 rounded-md text-3xs font-bold bg-surface-elevated text-text-secondary border border-border-custom">
            Opcje
          </span>
        )}
        {item.transactionType === 'direct' && (
          <span className="px-2 py-0.5 rounded-md text-3xs font-bold bg-surface-elevated text-text-muted border border-border-custom/50">
            D
          </span>
        )}
        {item.transactionType === 'award' && (
          <span className="px-2 py-0.5 rounded-md text-3xs font-bold bg-primary/10 text-primary border border-primary/20">
            Nagroda
          </span>
        )}
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
