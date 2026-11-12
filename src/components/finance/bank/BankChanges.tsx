import { spendingChanges, type CategorySpending } from '../../../lib/finance/bankSpending';
import { formatCurrency } from '../../../lib/finance/formatMoney';

interface Props { current: CategorySpending[]; previous: CategorySpending[]; currency: string }

/** Trzy największe zmiany wydatków względem tego samego okresu poprzedniego miesiąca. */
export function BankChanges({ current, previous, currency }: Props) {
  const rows = spendingChanges(current, previous);
  if (!rows.length) return null;
  return (
    <div className="border-t border-border-custom/20 px-4 py-3">
      <p className="mb-2 text-xs font-medium text-text-muted">Co się zmieniło od zeszłego miesiąca</p>
      <ul className="space-y-1.5">
        {rows.map(row => (
          <li key={row.category} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-text-primary">{row.label}</span>
            <span className={`shrink-0 font-semibold tabular-nums ${row.delta > 0 ? 'text-danger' : 'text-success'}`}>
              {row.delta > 0 ? '+' : '−'}{formatCurrency(Math.abs(row.delta), currency)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
