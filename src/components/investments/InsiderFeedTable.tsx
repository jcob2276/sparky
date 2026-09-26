import { FC, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { InsiderFeedItem } from '../../lib/investments/insidersService';
import { InsiderFeedRow } from './InsiderFeedRow';

interface Props {
  feed: InsiderFeedItem[];
  onSelectTicker?: (ticker: string) => void;
}

export const InsiderFeedTable: FC<Props> = ({ feed, onSelectTicker }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="rounded-3xl bg-surface border border-border-custom shadow-2xs overflow-hidden">
      {/* Header with Toggle */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => e.key === 'Enter' && setIsOpen(!isOpen)}
        className="w-full p-5 sm:p-6 flex items-center justify-between gap-3 text-left hover:bg-surface-elevated/40 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronUp size={16} className="text-text-muted" /> : <ChevronDown size={16} className="text-text-muted" />}
          <h3 className="text-xs sm:text-sm font-black text-text-primary tracking-wider uppercase font-mono">
            Pełny feed transakcji ({feed.length})
          </h3>
        </div>
        <span className="text-3xs font-mono font-bold text-text-muted uppercase">
          {isOpen ? 'Zwiń' : 'Rozwiń'}
        </span>
      </div>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="border-t border-border-custom/50 p-2 sm:p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-custom/40 text-3xs font-mono uppercase tracking-wider text-text-muted">
                  <th className="py-2.5 px-3 font-semibold">Zgłoszenie</th>
                  <th className="py-2.5 px-3 font-semibold">Spółka</th>
                  <th className="py-2.5 px-3 font-semibold">Insider</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Typ</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Akcje</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Cena</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Wartość</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom/30 text-xs font-mono">
                {feed.map((item) => (
                  <InsiderFeedRow
                    key={item.id}
                    item={item}
                    onSelectTicker={onSelectTicker}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {feed.length === 0 && (
            <div className="text-center py-8 text-xs font-mono text-text-muted">
              Brak transakcji do wyświetlenia
            </div>
          )}
        </div>
      )}
    </div>
  );
};
