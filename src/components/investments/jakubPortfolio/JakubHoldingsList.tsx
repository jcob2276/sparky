import { FC, useState } from 'react';
import type { PortfolioPosition } from '../../../lib/investments/jakubPortfolioStorage';
import { JakubHoldingItem } from './JakubHoldingItem';
import { ArrowUpDown } from 'lucide-react';
import Button from '../../ui/Button';

interface Props {
  positions: PortfolioPosition[];
  onAskAnalyst: (ticker: string, companyName: string) => void;
}

export const JakubHoldingsList: FC<Props> = ({ positions, onAskAnalyst }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortDesc, setSortDesc] = useState(true);

  const sortedPositions = [...positions].sort((a, b) =>
    sortDesc ? b.currentValue - a.currentValue : a.currentValue - b.currentValue
  );

  const totalValue = positions.reduce((acc, p) => acc + p.currentValue, 0);

  return (
    <div className="space-y-3">
      {/* 1. Sort Bar */}
      <div className="flex items-center justify-between px-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setSortDesc((prev) => !prev)}
          className="text-3xs sm:text-xs font-mono text-text-muted hover:text-text-primary gap-1 px-2 h-7"
        >
          <ArrowUpDown size={12} />
          <span>Sortuj wg wartości ({sortDesc ? 'od największej' : 'od najmniejszej'})</span>
        </Button>

        <span className="text-3xs font-mono text-text-muted">
          Łącznie w aktywach:{' '}
          <strong className="text-text-primary">
            {totalValue.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
          </strong>
        </span>
      </div>

      {/* 2. Holdings List */}
      {sortedPositions.length > 0 ? (
        <div className="space-y-2.5">
          {sortedPositions.map((pos) => (
            <JakubHoldingItem
              key={pos.id}
              position={pos}
              totalValue={totalValue}
              isExpanded={expandedId === pos.id}
              onToggleExpand={() => setExpandedId(expandedId === pos.id ? null : pos.id)}
              onAskAnalyst={onAskAnalyst}
            />
          ))}
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-surface border border-border-custom text-center text-xs text-text-muted font-mono">
          Brak otwartych pozycji w portfelu.
        </div>
      )}
    </div>
  );
};
