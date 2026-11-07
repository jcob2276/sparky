import type { CategorySpending } from '../../lib/finance/bankSpending';
import { formatCurrency } from '../../lib/finance/formatMoney';
import Button from '../ui/Button';

/** Wydatki bieżącego miesiąca po kategorii: pasek udziału i kwota, żeby od razu było widać, na co idą pieniądze. */
export function BankSpendingSummary({ spending, currency = 'PLN', onSelect }: { spending: CategorySpending[]; currency?: string; onSelect: (category: string) => void }) {
  const total = spending.reduce((sum, row) => sum + row.total, 0);
  return (
    <div className="space-y-2 border-t border-border-custom/20 px-4 pb-3 pt-3">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-text-primary">Na co wychodzi</p>
        <p className="text-sm font-semibold text-text-primary ui-num">{spending.length ? formatCurrency(total, currency) : '—'}</p>
      </div>
      <ul className="space-y-1.5">
        {spending.map((row) => (
          <li key={row.category} className="space-y-0.5">
            <Button variant="ghost" className="flex min-h-11 w-full items-baseline justify-between gap-3 text-left text-sm" onClick={() => onSelect(row.category)}>
              <span className="text-text-secondary">{row.label}</span>
              <span className="shrink-0 text-text-primary ui-num">{formatCurrency(row.total, currency)} · {Math.round(row.share * 100)}%</span>
            </Button>
            <div className="h-1 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, Math.round(row.share * 100))}%` }} />
            </div>
          </li>
        ))}
      </ul>
      {spending.length === 0 && <p className="py-3 text-sm text-text-muted">Brak zaksięgowanych wydatków w tym okresie.</p>}
    </div>
  );
}
