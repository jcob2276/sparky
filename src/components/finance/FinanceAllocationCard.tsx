import type { ValuedHolding } from '@vanguard/domain';
import type { FinanceAccount } from '../../lib/financeApi';
import { buildAllocationSlices } from '../../lib/finance/allocationSlices';
import { formatPln } from '../../lib/finance/formatMoney';
import { FinanceEmpty, FinanceSection } from './financeUi';

interface FinanceAllocationCardProps {
  accounts: FinanceAccount[];
  holdings: ValuedHolding[];
}

export function FinanceAllocationCard({ accounts, holdings }: FinanceAllocationCardProps) {
  const slices = buildAllocationSlices(accounts, holdings);

  return (
    <FinanceSection title="Gdzie jest majątek">
      {slices.length === 0 ? (
        <FinanceEmpty>Dodaj konta i pozycje, żeby zobaczyć podział majątku.</FinanceEmpty>
      ) : (
        <ul className="space-y-3 px-4 py-4">
          {slices.map((slice) => (
            <li key={slice.key} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium text-text-primary">{slice.label}</span>
                <span className="tabular-nums text-text-secondary">
                  {formatPln(slice.amount)} · {slice.pct.toFixed(1).replace('.', ',')}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-primary" style={{ width: `${slice.pct}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </FinanceSection>
  );
}
