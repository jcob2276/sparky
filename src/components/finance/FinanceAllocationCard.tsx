import type { ValuedHolding } from '@vanguard/domain';
import type { FinanceAccount } from '../../lib/financeApi';
import { buildAllocationSlices } from '../../lib/finance/allocationSlices';
import { formatPln } from '../../lib/finance/formatMoney';
import { Money } from './FinanceMoney';
import { FinanceEmpty, FinanceSection } from './financeUi';

interface FinanceAllocationCardProps {
  accounts: FinanceAccount[];
  holdings: ValuedHolding[];
}

export function FinanceAllocationCard({ accounts, holdings }: FinanceAllocationCardProps) {
  const slices = buildAllocationSlices(accounts, holdings);
  const total = slices.reduce((sum, slice) => sum + slice.amount, 0);

  return (
    <FinanceSection title="Gdzie jest majątek">
      {slices.length === 0 ? (
        <FinanceEmpty>Dodaj konta i pozycje, żeby zobaczyć podział majątku.</FinanceEmpty>
      ) : (
        <div className="space-y-4 px-4 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm text-text-muted">Razem z oszczędnościami</p>
            <Money value={total} className="text-lg font-semibold tabular-nums" />
          </div>
          <ul className="space-y-4" aria-label="Podział majątku według rodzaju">
            {slices.map((slice) => <li key={slice.key} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="min-w-0 break-words">{slice.label}</span>
                <span className="shrink-0 tabular-nums text-text-secondary">{formatPln(slice.amount)} · {slice.pct.toFixed(1).replace('.', ',')}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                <div className="h-full rounded-full bg-primary" style={{ width: `${slice.pct}%` }} />
              </div>
            </li>)}
          </ul>
        </div>
      )}
    </FinanceSection>
  );
}
