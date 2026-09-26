import { FC } from 'react';
import { HoldingChangeItem } from '../../lib/investments/superinvestorDetailService';
import { CompanyLogo } from './CompanyLogo';

interface Props {
  holding: HoldingChangeItem;
  onSelectTicker?: (ticker: string) => void;
}

export const SuperinvestorHoldingRow: FC<Props> = ({ holding: h, onSelectTicker }) => {
  const isPositiveDelta = (h.sharesDelta || 0) > 0;
  const isNegativeDelta = (h.sharesDelta || 0) < 0;

  return (
    <tr className="hover:bg-surface-elevated/40 transition-colors group">
      {/* Pozycja: Logo + Ticker + Nazwa */}
      <td className="py-3 px-3">
        <div
          onClick={() => onSelectTicker?.(h.ticker)}
          className={`flex items-center gap-2.5 ${onSelectTicker ? 'cursor-pointer' : ''}`}
        >
          <CompanyLogo ticker={h.ticker} name={h.companyName} size={28} />
          <div className="min-w-0">
            <div className="font-bold text-text-primary group-hover:text-primary transition-colors flex items-center gap-1.5">
              {h.ticker}
            </div>
            <div className="text-3xs text-text-muted truncate max-w-36 sm:max-w-44">
              {h.companyName}
            </div>
          </div>
        </div>
      </td>

      {/* Waga */}
      <td className="py-3 px-3 text-right font-bold text-text-primary">
        {h.weightPct.toFixed(1).replace('.', ',')}%
      </td>

      {/* Akcje */}
      <td className="py-3 px-3 text-right text-text-secondary">
        {h.sharesNow ? Math.round(h.sharesNow).toLocaleString('pl-PL') : '—'}
      </td>

      {/* Δ Akcji */}
      <td
        className={`py-3 px-3 text-right font-semibold ${
          isPositiveDelta ? 'text-success' : isNegativeDelta ? 'text-danger' : 'text-text-muted'
        }`}
      >
        {h.sharesDelta
          ? `${isPositiveDelta ? '+' : ''}${Math.round(h.sharesDelta).toLocaleString('pl-PL')}`
          : '—'}
      </td>

      {/* Wartość */}
      <td className="py-3 px-3 text-right font-bold text-text-primary">
        {h.valueFormatted}
      </td>

      {/* Zmiana Badge */}
      <td className="py-3 px-3 text-right">
        {h.changeType === 'new' && (
          <span className="px-2 py-0.5 rounded-md text-3xs font-bold bg-success/10 text-success border border-success/20">
            Nowa pozycja
          </span>
        )}
        {h.changeType === 'decreased' && (
          <span className="px-2 py-0.5 rounded-md text-3xs font-bold bg-danger/10 text-danger border border-danger/20">
            Zredukowano {h.sharesDeltaPct ? `${h.sharesDeltaPct}%` : ''}
          </span>
        )}
        {h.changeType === 'increased' && (
          <span className="px-2 py-0.5 rounded-md text-3xs font-bold bg-success/10 text-success border border-success/20">
            Dokupiono {h.sharesDeltaPct ? `+${h.sharesDeltaPct}%` : ''}
          </span>
        )}
        {h.changeType === 'sold' && (
          <span className="px-2 py-0.5 rounded-md text-3xs font-bold bg-surface-elevated text-text-muted border border-border-custom">
            Sprzedano
          </span>
        )}
        {h.changeType === 'unchanged' && (
          <span className="px-2 py-0.5 rounded-md text-3xs font-bold bg-surface-elevated text-text-secondary border border-border-custom/50">
            Bez zmian
          </span>
        )}
      </td>
    </tr>
  );
};
