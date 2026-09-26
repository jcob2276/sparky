import { FC, useState } from 'react';
import type { PortfolioPosition } from '../../../lib/investments/jakubPortfolioStorage';
import { JakubHoldingItem } from './JakubHoldingItem';
import { ArrowUpDown } from 'lucide-react';
import Button from '../../ui/Button';

interface Props {
  positions: PortfolioPosition[];
  onAskAnalyst: (ticker: string, companyName: string) => void;
}

type SubTab = 'otwarte' | 'oczekujace' | 'zamkniete' | 'operacje';

export const JakubHoldingsList: FC<Props> = ({ positions, onAskAnalyst }) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('otwarte');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortDesc, setSortDesc] = useState(true);

  const sortedPositions = [...positions].sort((a, b) =>
    sortDesc ? b.currentValue - a.currentValue : a.currentValue - b.currentValue
  );

  const totalValue = positions.reduce((acc, p) => acc + p.currentValue, 0);

  return (
    <div className="space-y-4">
      {/* 1. Sub-Tabs matching mobile app */}
      <div className="flex items-center gap-1 sm:gap-2 border-b border-border-custom overflow-x-auto pb-1 scrollbar-none">
        <Button
          size="sm"
          variant={activeSubTab === 'otwarte' ? 'tonal' : 'ghost'}
          onClick={() => setActiveSubTab('otwarte')}
          className="rounded-xl text-xs font-bold"
        >
          Otwarte ({positions.length})
        </Button>

        <Button
          size="sm"
          variant={activeSubTab === 'oczekujace' ? 'tonal' : 'ghost'}
          onClick={() => setActiveSubTab('oczekujace')}
          className="rounded-xl text-xs font-bold text-text-muted"
        >
          Oczekujące (0)
        </Button>

        <Button
          size="sm"
          variant={activeSubTab === 'zamkniete' ? 'tonal' : 'ghost'}
          onClick={() => setActiveSubTab('zamkniete')}
          className="rounded-xl text-xs font-bold text-text-muted"
        >
          Zamknięte (0)
        </Button>

        <Button
          size="sm"
          variant={activeSubTab === 'operacje' ? 'tonal' : 'ghost'}
          onClick={() => setActiveSubTab('operacje')}
          className="rounded-xl text-xs font-bold text-text-muted"
        >
          Operacje gotówkowe
        </Button>
      </div>

      {/* 2. Sort Bar */}
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

      {/* 3. Tab Contents */}
      {activeSubTab === 'otwarte' ? (
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
      ) : activeSubTab === 'operacje' ? (
        <div className="p-6 rounded-2xl bg-surface border border-border-custom text-center space-y-2">
          <div className="font-bold text-xs text-text-primary">Operacje gotówkowe portfela</div>
          <p className="text-3xs text-text-muted max-w-md mx-auto">
            Wpłaty, wypłaty oraz rozliczenia transakcji giełdowych. Środki gotówkowe gotowe do kolejnych inwestycji.
          </p>
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-surface border border-border-custom text-center text-xs text-text-muted font-mono">
          Brak pozycji w tej zakładce.
        </div>
      )}
    </div>
  );
};
