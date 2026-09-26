import { FC } from 'react';
import type { SearchCompanyResult } from '../../lib/investments/watchlistService';

interface Props {
  suggestions: SearchCompanyResult[];
  watchlist: string[];
  onSelect: (item: SearchCompanyResult) => void;
}

export const WatchlistSuggestionsDropdown: FC<Props> = ({
  suggestions,
  watchlist,
  onSelect,
}) => {
  if (suggestions.length === 0) return null;

  return (
    <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-surface border border-border-custom rounded-2xl shadow-xl overflow-hidden divide-y divide-border-custom/40 animate-fade-in">
      <div className="p-2 text-2xs font-semibold text-text-muted uppercase tracking-wider bg-surface/80">
        Dopasowane spółki w bazie danych:
      </div>
      {suggestions.map((item) => {
        const isAlready = watchlist.includes(item.ticker.toUpperCase());
        return (
          <div
            key={`${item.market}-${item.ticker}`}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(item)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onSelect(item);
            }}
            className="w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-primary/10 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-surface border border-border-custom shadow-xs text-text-primary">
                ${item.ticker}
              </span>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-text-primary truncate">{item.name}</div>
                {item.sector && <div className="text-2xs text-text-muted truncate">{item.sector}</div>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`px-1.5 py-0.5 rounded text-2xs font-bold border ${
                  item.market === 'GPW'
                    ? 'bg-danger/10 text-danger border-danger/20'
                    : 'bg-info/10 text-info border-info/20'
                }`}
              >
                {item.market}
              </span>
              {isAlready && (
                <span className="text-2xs text-text-muted font-medium bg-surface px-1.5 py-0.5 rounded border border-border-custom">
                  Na liście
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
