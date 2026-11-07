import type { CategorySpending } from '../../lib/finance/bankSpending';
import { formatPln } from '../../lib/finance/formatMoney';

const MAX_ROWS = 6;

/** Wydatki bieżącego miesiąca po kategorii: pasek udziału i kwota, żeby od razu było widać, na co idą pieniądze. */
export function BankSpendingSummary({ spending }: { spending: CategorySpending[] }) {
  if (spending.length === 0) return null;
  const total = spending.reduce((sum, row) => sum + row.total, 0);
  return (
    <div className="space-y-2 border-t border-border-custom/20 px-4 pb-3 pt-3">
      <div className="flex items-baseline justify-between">
        <p className="text-xs text-text-muted">Wydatki w tym miesiącu</p>
        <p className="text-sm font-semibold text-text-primary ui-num">{formatPln(total, 2)}</p>
      </div>
      <ul className="space-y-1.5">
        {spending.slice(0, MAX_ROWS).map((row) => (
          <li key={row.category} className="space-y-0.5">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-text-secondary">{row.label}</span>
              <span className="text-text-primary ui-num">{formatPln(row.total, 2)}</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, Math.round(row.share * 100))}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
