import {
  buildCashflowMonth,
  type CashflowEventInput,
  type CashflowMonthSummary,
} from '@vanguard/domain';
import type { FinanceBundle } from '../financeApi';
import { getTodayWarsaw } from '../date';

export function buildFinanceCashflowMonth(
  bundle: Pick<FinanceBundle, 'bills' | 'subscriptions' | 'incomeSources' | 'transactions'>,
  monthKey: string,
  startingBalance: number,
  today = getTodayWarsaw(),
): CashflowMonthSummary {
  const [year, month] = monthKey.split('-').map(Number);
  const events: CashflowEventInput[] = [];

  for (const bill of bundle.bills) {
    if (!bill.is_active) continue;
    events.push({ kind: 'bill', name: bill.name, amount: bill.amount, day: bill.due_day });
  }

  for (const sub of bundle.subscriptions) {
    if (!sub.is_active) continue;
    const renewalDay = sub.renewal_date ? Number(sub.renewal_date.split('-')[2]) : 1;
    events.push({
      kind: 'subscription',
      name: sub.name,
      amount: sub.amount_monthly,
      day: Number.isFinite(renewalDay) && renewalDay > 0 ? renewalDay : 1,
    });
  }

  for (const source of bundle.incomeSources) {
    if (!source.is_active) continue;
    events.push({
      kind: 'income',
      name: source.name,
      amount: source.amount_monthly,
      day: 10,
    });
  }

  // Saldo jest bieżące: wykonane transakcje już się w nim znajdują. Prognoza obejmuje tylko przyszłe plany.
  const currentMonth = today.slice(0, 7);
  const days = new Date(year, month, 0).getDate();
  const remaining = monthKey < currentMonth ? [] : monthKey > currentMonth ? events
    : events.filter(event => Math.min(event.day, days) > Number(today.slice(8)));
  return buildCashflowMonth(year, month, remaining, startingBalance);
}
