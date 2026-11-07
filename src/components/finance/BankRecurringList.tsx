import type { RecurringPayment } from '@vanguard/domain';
import { formatWarsawDate } from '../../lib/date';
import { formatPln } from '../../lib/finance/formatMoney';
import { FinanceList, FinanceRow } from './financeUi';

const MAX_ROWS = 6;
const CADENCE_LABEL = { monthly: 'co miesiąc', weekly: 'co tydzień' } as const;

/** Wydatki, które wracają regularnie: widać, ile kosztują miesięcznie i kiedy będzie następne obciążenie. */
export function BankRecurringList({ items }: { items: RecurringPayment[] }) {
  if (items.length === 0) return null;
  const monthly = items.reduce((sum, item) => sum + item.monthlyCost, 0);
  return (
    <div className="border-t border-border-custom/20">
      <div className="flex items-baseline justify-between px-4 pb-1 pt-3">
        <p className="text-sm font-medium text-text-primary">Powtarzają się</p>
        <p className="text-xs text-text-muted ui-num">≈ {formatPln(monthly, 2)} / mies.</p>
      </div>
      <FinanceList>
        {items.slice(0, MAX_ROWS).map((item) => (
          <FinanceRow
            key={item.key}
            primary={item.name}
            secondary={`${CADENCE_LABEL[item.cadence]} · ${item.count}× · następne ok. ${formatWarsawDate(item.nextExpected)}`}
            trailing={formatPln(item.typicalAmount, 2)}
          />
        ))}
      </FinanceList>
    </div>
  );
}
