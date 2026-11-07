import type { RecurringPayment } from '@vanguard/domain';
import { formatWarsawDate, getTodayWarsaw } from '../../lib/date';
import { formatCurrency } from '../../lib/finance/formatMoney';
import { FinanceList, FinanceRow } from './financeUi';

const CADENCE_LABEL = { monthly: 'co miesiąc', weekly: 'co tydzień' } as const;

/** Wydatki, które wracają regularnie: widać, ile kosztują miesięcznie i kiedy będzie następne obciążenie. */
export function BankRecurringList({ items, currency = 'PLN' }: { items: RecurringPayment[]; currency?: string }) {
  if (items.length === 0) return null;
  const monthly = items.reduce((sum, item) => sum + item.monthlyCost, 0);
  return (
    <div className="border-t border-border-custom/20">
      <div className="flex items-baseline justify-between px-4 pb-1 pt-3">
        <p className="text-sm font-medium text-text-primary">Powtarzają się</p>
        <p className="text-xs text-text-muted ui-num">≈ {formatCurrency(monthly, currency)} / mies.</p>
      </div>
      <FinanceList>
        {items.map((item) => (
          <FinanceRow
            key={item.key}
            primary={item.name}
            secondary={`${CADENCE_LABEL[item.cadence]} · ${item.count}× · ${formatWarsawDate(item.lastDate)} ostatnio · ${item.nextExpected < getTodayWarsaw() ? 'brak potwierdzenia kolejnej płatności' : `następne ok. ${formatWarsawDate(item.nextExpected)}`}`}
            trailing={formatCurrency(item.typicalAmount, currency)}
          />
        ))}
      </FinanceList>
      <p className="px-4 pb-3 text-xs text-text-muted">Powtórzenia w pobranej historii. To propozycje stałych płatności; termin i koszt miesięczny są szacowane.</p>
    </div>
  );
}
