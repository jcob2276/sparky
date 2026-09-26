import { FC } from 'react';
import { LiveHoldingItem } from '../../lib/investments/superinvestorsApi';

interface HoldingRowProps {
  holding: LiveHoldingItem;
}

export const HoldingRow: FC<HoldingRowProps> = ({ holding: h }) => {
  const changeBadge =
    h.changeType === 'new' ? (
      <span className="px-2 py-0.5 rounded-md text-2xs font-bold bg-success/15 text-success border border-success/30">
        Nowa pozycja
      </span>
    ) : h.changeType === 'increased' ? (
      <span className="px-2 py-0.5 rounded-md text-2xs font-bold bg-success/15 text-success border border-success/30">
        Zwiększona
      </span>
    ) : h.changeType === 'reduced' ? (
      <span className="px-2 py-0.5 rounded-md text-2xs font-bold bg-danger/15 text-danger border border-danger/30">
        Zmniejszona
      </span>
    ) : h.changeType === 'sold' ? (
      <span className="px-2 py-0.5 rounded-md text-2xs font-bold bg-danger/15 text-danger border border-danger/30">
        Sprzedana
      </span>
    ) : (
      <span className="px-2 py-0.5 rounded-md text-2xs font-medium text-text-secondary border border-border-custom/50">
        Bez zmian
      </span>
    );

  const valueDisplay =
    h.valueUsd > 1000000000
      ? `$${(h.valueUsd / 1000000000).toFixed(2)}B`
      : h.valueUsd > 1000000
      ? `$${(h.valueUsd / 1000000).toFixed(1)}M`
      : h.valueUsd > 0
      ? `$${h.valueUsd.toLocaleString()}`
      : '—';

  return (
    <tr className="hover:bg-surface transition-colors">
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-surface border border-border-custom text-text-primary font-mono font-bold text-xs shadow-xs">
            ${h.ticker}
          </span>
          <div>
            <div className="font-semibold text-text-primary">{h.name}</div>
            <div className="text-2xs text-text-secondary">{h.sector}</div>
          </div>
        </div>
      </td>
      <td className="py-3.5 px-4 text-right">
        <div className="font-bold text-text-primary font-mono tabular-nums">
          {h.weightPercent > 0 ? `${h.weightPercent.toFixed(1)}%` : '—'}
        </div>
        {h.weightPercent > 0 && (
          <div className="w-20 ml-auto bg-border-custom/30 rounded-full h-1.5 mt-1 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full"
              style={{ width: `${Math.min(100, h.weightPercent * 2.5)}%` }}
            />
          </div>
        )}
      </td>
      <td className="py-3.5 px-4 text-right font-mono text-text-primary tabular-nums font-medium">
        {valueDisplay}
      </td>
      <td className="py-3.5 px-4 text-right font-mono text-text-secondary tabular-nums text-xs">
        {h.shares > 0 ? h.shares.toLocaleString() : '—'}
      </td>
      <td className="py-3.5 px-4 text-center">{changeBadge}</td>
      <td className="py-3.5 px-4 text-right">
        {h.ticker && h.ticker !== '—' && (
          <a
            href={`https://www.tradingview.com/symbols/${h.ticker}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-primary hover:underline"
          >
            Wykres ↗
          </a>
        )}
      </td>
    </tr>
  );
};
