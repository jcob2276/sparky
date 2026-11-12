import type { CategorySpending } from '../../lib/finance/bankSpending';
import { formatCurrency } from '../../lib/finance/formatMoney';
import { FinanceDonut } from './FinanceDonut';
import { Money } from './FinanceMoney';

/** Spending of the period by category: a donut with the total in the middle, every category in the legend (tap to drill down). */
export function BankSpendingSummary({ spending, currency = 'PLN', onSelect, limit }: { spending: CategorySpending[]; currency?: string; onSelect?: (category: string) => void; limit?: number }) {
  const total = spending.reduce((sum, row) => sum + row.total, 0);
  const visible = limit == null ? spending : spending.slice(0, limit);
  const remaining = spending.slice(visible.length).reduce((sum, row) => sum + row.total, 0);
  const label = (row: CategorySpending) => `${formatCurrency(row.total, currency)} · ${Math.round(row.share * 100)}%`;
  const slices = [
    ...visible.map((row) => ({ key: row.category, label: row.label, amount: row.total, value: label(row) })),
    ...(remaining > 0 ? [{ key: '__rest', label: 'Pozostałe kategorie', amount: remaining, value: formatCurrency(remaining, currency) }] : []),
  ];
  return (
    <div className="space-y-3 border-t border-border-custom/20 pb-2 pt-4">
      {spending.length === 0
        ? <p className="px-4 py-3 text-sm text-text-muted">Brak zaksięgowanych wydatków w tym okresie.</p>
        : <FinanceDonut ariaLabel="Wydatki według kategorii" centerLabel="Na co wychodzi" center={<Money value={total} currency={currency} />} slices={slices} onSelect={onSelect} />}
    </div>
  );
}
