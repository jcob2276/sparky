import type { CategorySpending } from '../../lib/finance/bankSpending';
import { formatCurrency } from '../../lib/finance/formatMoney';
import { Pressable } from '../ui/ControlPrimitives';

/** Wydatki bieżącego miesiąca po kategorii: pasek udziału i kwota, żeby od razu było widać, na co idą pieniądze. */
export function BankSpendingSummary({ spending, currency = 'PLN', onSelect, limit }: { spending: CategorySpending[]; currency?: string; onSelect?: (category: string) => void; limit?: number }) {
  const total = spending.reduce((sum, row) => sum + row.total, 0);
  const visible = limit == null ? spending : spending.slice(0, limit);
  const remaining = spending.slice(visible.length).reduce((sum, row) => sum + row.total, 0);
  return (
    <div className="space-y-2 border-t border-border-custom/20 px-4 pb-3 pt-3">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-text-primary">Na co wychodzi</p>
        <p className="text-sm font-semibold text-text-primary ui-num">{spending.length ? formatCurrency(total, currency) : '—'}</p>
      </div>
      <ul className="space-y-1.5">
        {visible.map((row) => (
          <li key={row.category} className="space-y-0.5">
            {onSelect ? <Pressable type="button" className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-sm" onClick={() => onSelect(row.category)}>
              <span className="text-text-secondary">{row.label}</span>
              <span className="shrink-0 text-text-primary ui-num">{formatCurrency(row.total, currency)} · {Math.round(row.share * 100)}%</span>
            </Pressable> : <div className="flex min-h-11 items-center justify-between gap-3 text-sm">
              <span className="text-text-secondary">{row.label}</span>
              <span className="shrink-0 text-text-primary ui-num">{formatCurrency(row.total, currency)} · {Math.round(row.share * 100)}%</span>
            </div>}
            <div className="h-1 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, Math.round(row.share * 100))}%` }} />
            </div>
          </li>
        ))}
      </ul>
      {remaining > 0 && <p className="py-2 text-sm text-text-muted">Pozostałe kategorie: {formatCurrency(remaining, currency)}</p>}
      {spending.length === 0 && <p className="py-3 text-sm text-text-muted">Brak zaksięgowanych wydatków w tym okresie.</p>}
    </div>
  );
}
