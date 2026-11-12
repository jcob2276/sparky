import type { ValuedHolding } from '@vanguard/domain';
import type { FinanceAccount } from '../../lib/financeApi';
import { buildAllocationSlices } from '../../lib/finance/allocationSlices';
import { formatPln } from '../../lib/finance/formatMoney';
import { FinanceDonut } from './FinanceDonut';
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
        <div className="px-0 py-4">
          <FinanceDonut
            ariaLabel="Podział majątku według rodzaju"
            centerLabel="Razem z oszczędnościami"
            center={<Money value={total} />}
            slices={slices.map((slice) => ({
              key: slice.key,
              label: slice.label,
              amount: slice.amount,
              value: `${formatPln(slice.amount)} · ${slice.pct.toFixed(1).replace('.', ',')}%`,
            }))}
          />
        </div>
      )}
    </FinanceSection>
  );
}
