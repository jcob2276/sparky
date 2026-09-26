import { FC } from 'react';
import { GpwInsiderLiveTrade } from '../../lib/investments/gpwInsidersService';

interface Props {
  trade: GpwInsiderLiveTrade;
  onSelectTicker?: (ticker: string) => void;
}

export const GpwInsiderFeedRow: FC<Props> = ({ trade, onSelectTicker }) => {
  const isBuy = trade.side === 'buy';
  const isSell = trade.side === 'sell';

  return (
    <tr className="hover:bg-primary/5 transition-colors">
      {/* Data */}
      <td className="py-2.5 font-mono text-3xs text-text-secondary whitespace-nowrap">
        {trade.transactionDate}
      </td>

      {/* Spółka & Ticker */}
      <td className="py-2.5 font-mono">
        <span
          role="button"
          tabIndex={0}
          onClick={() => onSelectTicker?.(trade.ticker)}
          onKeyDown={(e) => e.key === 'Enter' && onSelectTicker?.(trade.ticker)}
          className="font-bold text-primary hover:underline cursor-pointer mr-1.5"
        >
          {trade.ticker}
        </span>
        <span className="text-3xs text-text-secondary truncate max-w-28 inline-block align-bottom">
          {trade.company}
        </span>
      </td>

      {/* Rodzaj badge */}
      <td className="py-2.5 text-center font-mono">
        <span
          className={`inline-block px-1.5 py-0.5 rounded-sm text-4xs font-bold uppercase ${
            isBuy
              ? 'bg-success/10 text-success border border-success/20'
              : isSell
                ? 'bg-danger/10 text-danger border border-danger/20'
                : 'bg-text-muted/10 text-text-muted border border-text-muted/20'
          }`}
        >
          {isBuy ? 'Nabycie' : isSell ? 'Zbycie' : 'Inne'}
        </span>
      </td>

      {/* Tytuł */}
      <td className="py-2.5 text-xs text-text-primary max-w-sm sm:max-w-md truncate">
        {trade.title}
      </td>

      {/* Raport źródłowy ESPI */}
      <td className="py-2.5 text-right whitespace-nowrap">
        <a
          href={trade.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-3xs font-mono font-medium text-primary hover:underline"
        >
          <span>Raport GPW</span>
          <span>↗</span>
        </a>
      </td>
    </tr>
  );
};
